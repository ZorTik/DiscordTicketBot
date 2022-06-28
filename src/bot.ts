import {Setup} from "./setup";
import {
    AnyChannel,
    CategoryChannel,
    Client,
    Guild,
    GuildChannel, GuildMember, Message, MessageEmbed,
    NonThreadGuildBasedChannel, Permissions, Role, Snowflake, TextChannel
} from "discord.js";
import {bot, client, config, exit, invokeStop, logger} from "./app";
import {ChannelReference, JsonFileMap, ValOpt} from "./configuration";
import {DefaultLogger} from "./logging";
import assert from "assert";
import {TicketBotData} from "./configuration/impl/data";
import {ChannelTypes} from "discord.js/typings/enums";
import {HasIdentity, HasName, Nullable} from "./types";
import {isAdmin, loadModulesRecursively} from "./util";
import {COLOR_INFO, JOIN_MESSAGE_KEY} from "./const";
import {TicketCategory} from "./configuration/impl/main";
import {PermissionHolder, PermissionHolderSnapshot} from "./permissions";
import {EventEmitter, NotifySubscriber} from "./event";
import {EVENTS} from "./api/event";
import {STATES} from "./api/state";
import {PERMISSIONS} from "./api/permission";

/**
 * The main bot class.
 * @author ZorTik
 */
export class TicketBot extends EventEmitter {

    private readonly bot: Client;
    private readonly logger: DefaultLogger;
    private readonly storage: JsonFileMap;
    readonly guildData: Map<string, Setup>;
    readonly reloadHandlers: ReloadHandler[];

    constructor(storage: JsonFileMap, bot: Client = client, _logger: DefaultLogger = logger) {
        super();
        this.logger = _logger;
        this.storage = storage;
        this.guildData = new Map<string, Setup>();
        bot.guilds.cache.forEach((g: Guild, key: Snowflake) => {
            this.initGuildData(key);
        });
        this.reloadHandlers = [];
        this.bot = bot;
        this.initSubscribers();
    }

    /**
     * Reloads the bot or specific portion of reload handlers.
     * @param guild_ The guild to reload bot in.
     * @param handlerIds The handler ids to reload.
     */
    async reload(guild_: Guild | string | null = null, handlerIds: string[] = []): Promise<Nullable<string>> {
        if(guild_ != null) {
            let guild = await this.fetchGuild(guild_);
            let guildData = guild != null? this.getGuildData(guild) : null;
            if(guild == null || guildData == null) {
                return "Guild is not loaded!";
            }
            if(!guildData.isComplete()) {
                return "Setup is not completed.";
            }
            for(let reloadHandler of this.reloadHandlers) {
                let id = (<HasIdentity>reloadHandler).id;
                if(handlerIds.length > 0 && (id == null || !handlerIds.includes(id))) {
                    continue;
                }
                try {
                    let err = await reloadHandler.onReload(guild, guildData);
                    if(err != null) {
                        return err;
                    }
                } catch(e) {
                    return `An unexpected error occurred: ${e}`;
                }
            }
        } else {
            for(let guild of this.bot.guilds.cache.values()) {
                let err = await this.reload(guild);
                if(err != null) {
                    logger.err(`Reload of guild '${guild.id}' failed: ${err}`);
                }
            }
        }
        return null;
    }

    /**
     * Performs setup tasks if setup is completed and sends a result
     * message to the given channel.
     * @param initChannel The channel to send the result message to.
     */
    async runSetup(initChannel: TextChannel | null = null): Promise<Nullable<string>> {
        let guild: Guild;
        if(initChannel instanceof GuildChannel && (guild = initChannel.guild) != null) {
            const guildData = this?.getGuildData(guild);
            let clearErrMessage = await this.clearResources(guild, guildData);
            if(clearErrMessage != null) {
                return clearErrMessage;
            }
            assert(guildData);
            let errMessage = this.checkSetup(guild.id);
            if(errMessage != null) {
                return errMessage;
            }
            await this.reload(guild); // Apply changes
            return null;
        }
        return Promise.reject("Guild is not loaded!");
    }

    /**
     * Makes new ticket channel and registers reference to it.
     * @param guild The guild to create the channel in.
     * @param requirements The requirements for the channel.
     */
    async makeTicket(guild: Guild, requirements: TicketRequirements | (TicketUsersRequirements & TicketRequirements)): Promise<Ticket | string> {
        let guildData = this.getGuildData(guild);
        if(guildData == null || !guildData.isComplete()) {
            return "Setup is not completed. Please set up the bot with /tickets setup.";
        }
        let category = await guildData.ticketsCategory.toDJSCanal(guild, this.bot);
        let creator = await guild.members.fetch(requirements.creatorId);
        if(category == null || !(category instanceof CategoryChannel) || creator == null) {
            return "Category or creator are not present.";
        }
        let ticketCategory = config.getCategories()
            .find(c => c.identifier === requirements.categoryId);
        if(ticketCategory == null) {
            return "Unknown category.";
        }
        let ticketChannel = await category.createChannel(`ticket-${ticketCategory.identifier}-${creator.user.username}`, {
            topic: `Ticket created by ${creator.nickname}\n
            Created at: ${new Date().toLocaleString()}`,
            type: ChannelTypes.GUILD_TEXT,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [
                        "VIEW_CHANNEL",
                        "SEND_MESSAGES",
                        "READ_MESSAGE_HISTORY",
                        "SEND_MESSAGES_IN_THREADS",
                        "SEND_TTS_MESSAGES"
                    ]
                }
            ]
        });
        let ticket = Ticket.saveIfAbsent(guildData, {
            canalId: ticketChannel.id,
            categoryId: ticketCategory.identifier,
            creatorId: creator.id,
            userIds: ((<TicketUsersRequirements>requirements).userIds) || [],
            state: STATES.OPEN,
            other: {}
        });
        let errorMessage = await ticket.runSetup();
        if(errorMessage != null) {
            await ticketChannel.delete();
            let ticketCache = guildData.tickets;
            ticketCache?.remove(ticket);
            return errorMessage;
        } else ticket.setState(STATES.OPEN);
        return ticket;
    }

    /**
     * Checks whether the setup is complete
     * for given guild id.
     * @param guildId The guild id.
     */
    checkSetup(guildId: string): Nullable<string> {
        let source = this.getGuildData(guildId);
        if(source == null) return "Guild is not loaded!";
        if(source.joinChannel.isEmpty()) {
            return "Join canal is not set!";
        } else if(source.ticketsCategory.isEmpty()) {
            return "Tickets category is not set!";
        }
        return null;
    }

    /**
     * Performs stop tasks.
     */
    stop() {
        logger.info("Stopping...");
        invokeStop();
        exit();
    }

    /**
     * Checks if given channel is registered as ticket channel.
     * @param channel The channel to check.
     */
    isTicketChannel(channel: AnyChannel): boolean {
        if(!(channel instanceof TextChannel)) {
            return false;
        }
        let guildId = channel.guild.id;
        return this.getTickets(guildId).some(t => t.canalId === channel.id);
    }


    /**
     * Checks if given guild member has permission node.
     * This method creates new user reference if does not exist.
     * @param member The member to check.
     * @param nodeId The node id.
     */
    hasPermission(member: GuildMember, nodeId: string): boolean {
        if(isAdmin(member)) {
            return true;
        }
        let guild = member.guild;
        let guildData = this.getGuildData(guild);
        if(guildData == null) {
            return false;
        }
        let ticketUser = guildData.getUser(member.id);
        return ticketUser.hasPermissionNode(nodeId) || member.roles.cache
            .some(r => guildData!!.getRole(r.id).hasPermissionNode(nodeId))
            || false;
    }

    /**
     * Returns all roles that contain provided node or permission
     * by given node id.
     * @param guild The guild to get from.
     * @param nodeId The node id.
     */
    getRolesByPermission(guild: Guild | string, nodeId: string): TicketRole[] {
        if(typeof guild === "string") {
            let g = this.bot.guilds.cache.get(guild);
            if(g == null) return [];
            guild = g;
        }
        let guildData = this.getGuildData(guild);
        if(guildData == null) return [];
        return guildData.roles?.data
            .filter(r => r.hasPermissionNode(nodeId)) || [];
    }

    /**
     * Tries to find ticket by given guild id and channel id.
     * @param guildId The guild id.
     * @param channel The channel id.
     */
    getTicket(guildId: string, channel: AnyChannel): Ticket | undefined {
        if(!this.isTicketChannel(channel)) return undefined;
        return this.getTickets(guildId).find(t => t.canalId === (<TextChannel>channel).id);
    }

    /**
     * Returns all saved ticket references.
     * @param guildId
     */
    getTickets(guildId: string | undefined | null): Ticket[] {
        if(guildId == null) return [];
        return this.getGuildData(guildId)?.tickets?.data || [];
    }

    /**
     * Returns cached guild.
     * @param guildId The guild id.
     */
    getGuild(guildId: string): Guild | undefined {
        return this.bot.guilds.cache
            .filter(g => g.id === guildId)
            .first();
    }

    /**
     * Returns cached bot guild data.
     * @param guild The guild.
     */
    getGuildData(guild: Guild | string): Nullable<Setup> {
        let id = guild instanceof Guild?
            guild.id : guild as string;
        return <Setup | null>(this.guildData.has(id)?this.guildData.get(id) : null);
    }

    /**
     * Initialization of internal event subscribers.
     * This method registers new subscribers to this
     * emitter. Talking about internal event system
     * which is not linked with DJS event system.
     * @private
     */
    private initSubscribers() {
        loadModulesRecursively("event-internal")
            .then(mods => mods.forEach(m => {
                let subs = <NotifySubscriber>m;
                let id = subs.evt;
                if(id != null) {
                    this.on(id, subs.on);
                }
            }));
    }

    private async clearResources(guild: Guild, guildData: Setup | null | undefined): Promise<Nullable<string>> {
        if(guildData == null) {
            return "Guild is not loaded.";
        }
        const joinCanal: ChannelReference = guildData.joinChannel;
        const mid = guildData.get(JOIN_MESSAGE_KEY);
        if(mid != null && joinCanal.isPresent()) {
            let djsC;
            if((djsC = await joinCanal.toDJSCanal(guild, this.bot)) != null) {
                await TicketBot.deleteInChannel(djsC, mid);
            }
        }
        let tickets = this.getTickets(guild.id);
        for(let ticket of tickets) {
            ticket.delete();
        }
        guildData.tickets?.splice(0, guildData.tickets?.length);
        guildData.save();
        return null;
    }
    private initGuildData(gId: string): boolean {
        this.guildData.set(gId, new Setup(this.storage, gId));
        return true;
    }
    private doIfCanalMember(channel: GuildChannel, action: (g: Guild, c: GuildChannel) => any) {
        this.supplyIfCanalMember(channel, action);
    }
    private supplyIfCanalMember<T>(channel: GuildChannel, action: (g: Guild, c: GuildChannel) => Nullable<T>): Nullable<T> {
        let guild = channel.guild;
        return guild != null ? action(guild, channel) : null;
    }
    private async fetchGuild(guild: Guild | string): Promise<Nullable<Guild>> {
        if(guild instanceof Guild) return guild;
        return this.bot.guilds.fetch(guild as string);
    }
    private static deleteInChannel(channel: AnyChannel, id: string): Promise<any> {
        if(channel.isText()) {
            channel = <TextChannel>channel;
            return channel.messages.fetch(id)
                .then((m: Message) => {
                    if(m.deletable) {
                        return m.delete();
                    }
                });
        } else if(channel instanceof CategoryChannel) {
            channel = <CategoryChannel>channel;
            let cToDel = Array.from(channel.children.values())
                .find((c: NonThreadGuildBasedChannel) => {
                    return c.id === id && c.deletable;
                });
            if(cToDel !== undefined) {
                cToDel.delete();
            }
        }
        return new Promise<unknown>(() => null);
    }
}

export type TicketState = HasName & {
    id: string;
}

export type TicketData = {
    canalId: string;
    categoryId: string,
    creatorId: string;
    userIds: string[];
    state: TicketState;
    other: any;
}
export class Ticket extends ChannelReference {

    static async make(guild: Guild, requirements: TicketRequirements): Promise<Ticket | string> {
        return bot.makeTicket(guild, requirements);
    }
    static saveIfAbsent(data: TicketBotData, ticketData: TicketData): Ticket {
        let ticket = new Ticket(data, ticketData);
        if(!data.getTicketIds().some(id => id === ticket.canalId)) {
            data.tickets?.push(ticket);
            data.save();
        }
        return ticket;
    }

    readonly botData: TicketBotData;
    readonly ticketData: TicketData;
    readonly guildId: string;
    readonly canalId: string;
    private constructor(data: TicketBotData, ticketData: TicketData) {
        super(ticketData.canalId);
        this.botData = data;
        this.ticketData = ticketData;
        this.guildId = data.guildId;
        this.canalId = ticketData.canalId;
    }
    async runSetup(): Promise<string | null> {
        let channel = await this.fetchChannel();
        if(channel == null || !channel.isText()) {
            return "Channel of the ticket is not present!";
        }
        await this.setVisibility(true, channel);
        let category = config.getCategory(this.ticketData.categoryId);
        let author: GuildMember | null = null;
        try {
            author = await channel.guild.members.fetch(this.ticketData.creatorId)
        } catch(ignored) {}
        await channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor(COLOR_INFO)
                    .setTitle(category.mapIfPresent(c => c.name) || "Unknown Category")
                    .setDescription(category.mapIfPresent(c => c.info
                        .replaceAll("%n", "\n")) || "No description info.")
            ],
            content: author?.toString()
        });
        bot.emit(EVENTS.TICKET.CREATE, this);
        return null;
    }
    async delete(): Promise<boolean> {
        let guild = bot.getGuild(this.guildId);
        if(guild == null) return false;
        let channel = await guild.channels.fetch(this.canalId);
        if(channel != null) {
            try {
                await channel.delete();
            } catch(err) {
                logger.err(`Cannot delete ticket channel ${this.canalId} on server ${this.guildId} (${guild.name}): ${err}`);
                return false;
            }
        }
        let tickets = this.botData.tickets;
        if(tickets != null) {
            tickets.remove(this);
            this.botData.save();
        }
        return true;
    }
    async setVisibility(visible: boolean, channel: Nullable<AnyChannel> = null): Promise<boolean> {
        if(channel == null) {
            channel = (await this.fetchChannel());
        }
        if(channel == null || !channel.isText()) {
            return false;
        }
        channel = <TextChannel>channel;
        let edit: (editId: string, state: boolean) => void = (eId, state) => {
            (<TextChannel>channel)!!.permissionOverwrites.edit(eId, {
                VIEW_CHANNEL: state,
                SEND_MESSAGES: state,
                SEND_TTS_MESSAGES: state,
                READ_MESSAGE_HISTORY: state,
            });
        }
        let ids = [...this.ticketData.userIds, this.ticketData.creatorId];
        ids.forEach(eId => edit(eId, visible));
        bot.getRolesByPermission(channel.guild, PERMISSIONS.COMMANDS.TICKET_ADMIN)
            .map(r => r.roleId).forEach(rId => {
                edit(rId, true);
        })
        return true;
    }

    setState(state: TicketState) {
        this.ticketData.state = state;
        this.botData.save();
        bot.emit(EVENTS.TICKET.STATE_CHANGE, this);
    }
    getUsers(): TicketUser[] {
        return this.ticketData.userIds.map(this.botData.getUser);
    }
    getCategory(): ValOpt<TicketCategory> {
        return config.getCategory(this.ticketData.categoryId);
    }
    async fetchGuild(): Promise<Nullable<Guild>> {
        return await client.guilds.fetch(this.guildId);
    }
    async fetchChannel(): Promise<NonThreadGuildBasedChannel | null> {
        let guild = bot.getGuild(this.guildId);
        if(guild == null) return null;
        return await guild.channels.fetch(this.canalId);
    }
}

export class TicketUser extends PermissionHolder {
    private readonly memberId: string;
    constructor(memberId: string) {
        super();
        this.memberId = memberId;
    }

    /**
     * Checks if this user has specific permission or
     * permission group. Difference between this method
     * and PermissionHolder.hasPermissionNode is that
     * this method checks if the user has administrator
     * permissions on the server.
     * @param id The permission or permission context id
     * @param guild The guild to check the permission on
     */
    async hasPermissionOnGuild(id: string, guild: Guild | string | undefined): Promise<boolean> {
        if(typeof guild === "string") {
            guild = bot.getGuild(guild);
        }
        if(guild !== undefined) {
            let member = await guild.members.fetch(this.memberId);
            if(member != null && member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
                return true;
            }
        }
        return super.hasPermissionNode(id);
    }

    get getMemberId(): string {
        return this.memberId;
    }
    async toDJSMember(g: Guild): Promise<GuildMember> {
        return await g.members.fetch(this.memberId);
    }
}

export type TicketRoleData = PermissionHolderSnapshot & {
    roleId: string;
}

/**
 * Represents guild role reference.
 */
export class TicketRole extends PermissionHolder {
    readonly roleId: string;
    constructor(snapshot: TicketRoleData) {
        super(snapshot.permissions.nodes, snapshot.groups);
        this.roleId = snapshot.roleId;
    }
    async toDJSRole(g: Guild): Promise<Nullable<Role>> {
        return await g.roles.fetch(this.roleId);
    }
}

export type TicketUsersRequirements = {
    userIds: string[];
}

export type TicketRequirements = {
    categoryId: string,
    creatorId: string;
}

export type ReloadHandler = ReloadHandlerEvent | (HasIdentity & ReloadHandlerEvent);

type ReloadHandlerEvent = {
    onReload: (guild: Guild, data: Setup) => Promise<Nullable<string>>;
}