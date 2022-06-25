import {Setup} from "./setup";
import {
    AnyChannel,
    CategoryChannel,
    Client,
    Guild,
    GuildChannel, GuildMember, Interaction,
    Message,
    NonThreadGuildBasedChannel, Snowflake, TextChannel
} from "discord.js";
import {bot, client, config, exit, invokeStop, logger} from "./app";
import {Canal, JsonFileMap} from "./configuration";
import {DefaultLogger} from "./logging";
import assert from "assert";
import {Ticket} from "./configuration/impl/data";
import {ChannelTypes} from "discord.js/typings/enums";
import {HasIdentity, HasName, Nullable} from "./types";
import {groups} from "./api/permission";
import {isAdmin, replyError, ReplyInteraction} from "./util";
import {JOIN_MESSAGE_KEY} from "./const";

/**
 * The main bot class.
 * @author ZorTik
 */
export class TicketBot {

    private readonly guildData: Map<string, Setup>;
    private readonly bot: Client;
    private readonly logger: DefaultLogger;
    private readonly storage: JsonFileMap;
    readonly reloadHandlers: ReloadHandler[];

    constructor(storage: JsonFileMap, bot: Client = client, _logger: DefaultLogger = logger) {
        this.logger = _logger;
        this.storage = storage;
        this.guildData = new Map<string, Setup>();
        bot.guilds.cache.forEach((g: Guild, key: Snowflake) => {
            this.initGuildData(key);
        });
        this.reloadHandlers = [];
        this.bot = bot;
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
                    deny: ["VIEW_CHANNEL"]
                }
            ]
        });
        let ticket = Ticket.saveIfAbsent(guildData, {
            canalId: ticketChannel.id,
            categoryId: ticketCategory.identifier,
            creatorId: creator.id,
            userIds: ((<TicketUsersRequirements>requirements).userIds) || []
        });
        let errorMessage = await ticket.runSetup();
        if(errorMessage != null) {
            await ticketChannel.delete();
            let ticketCache = guildData.tickets;
            ticketCache?.remove(ticket);
            return errorMessage;
        }
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
        let ticketUser = guildData?.getUser(member.id);
        return ticketUser?.hasPermissionNode(nodeId) || false;
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
    getTickets(guildId: string): Ticket[] {
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
    private async clearResources(guild: Guild, guildData: Setup | null | undefined): Promise<Nullable<string>> {
        if(guildData == null) {
            return "Guild is not loaded.";
        }
        const joinCanal: Canal = guildData.joinChannel;
        const mid = guildData.get(JOIN_MESSAGE_KEY);
        if(mid != null && joinCanal.isPresent()) {
            let djsC;
            if((djsC = await joinCanal.toDJSCanal(guild, this.bot)) != null) {
                await TicketBot.deleteInChannel(djsC, mid);
            }
        }
        let tickets = this.getTickets(guild.id);
        for(let ticket of tickets) {
            await ticket.delete();
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
    private supplyIfCanalMember<T>(channel: GuildChannel, action: (g: Guild, c: GuildChannel) => Nullable<T>): T | null {
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

export class PermissionHolder {

    readonly permissions: PermissionContext;
    readonly groups: string[];

    constructor(permissions: PermissionNode[] = [], groups: string[] = []) {
        this.permissions = {
            nodes: permissions
        }
        this.groups = groups;
    }

    /**
     * Checks if this permission holder contains
     * node with given id. The id can be either:
     * - Node ID
     * - Permission string
     * @param id The id to check.
     */
    hasPermissionNode(id: string): boolean {
        return this.hasPermissionNodeInContext(id, this.permissions)
            || this.getPermissionGroups().some(g => this.hasPermissionNodeInContext(id, g));
    }

    getPermissionGroups(): PermissionGroup[] {
        return groups().filter(g => this.groups.includes(g.id));
    }

    private hasPermissionNodeInContext(id: string, context: PermissionContext): boolean {
        return context.nodes
            .some(n => {
                let c = <HasIdentity & PermissionContext>n;
                let contextId = c.id;
                return (contextId != null && (contextId === id || this.hasPermissionNodeInContext(id, c)))
                    || (contextId == null && id === n);
            });
    }

}

export async function doIfHasPermission(interaction: ReplyInteraction, nodeId: string, task: (member: GuildMember) => Promise<void> | void) {
    let member = interaction.member;
    if(member == null || !(member instanceof GuildMember) || !bot.hasPermission(member, nodeId)) {
        await replyError(interaction, "You don't have permission to do this.");
        return;
    }
    let res = task(member);
    if(res instanceof Promise) {
        await res;
    }
}

export type PermissionContext = {
    nodes: PermissionNode[];
}
export type PermissionGroup = (HasIdentity & HasName & PermissionContext);
export type PermissionNode = PermissionGroup | string;

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