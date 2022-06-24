import {Setup} from "./setup";
import {
    AnyChannel,
    CategoryChannel,
    Client,
    Guild,
    GuildChannel,
    Message,
    NonThreadGuildBasedChannel,
    Snowflake,
    TextChannel
} from "discord.js";
import {client, config, exit, invokeStop, logger} from "./app";
import {Canal, JsonFileMap} from "./configuration";
import {DefaultLogger} from "./logging";
import assert from "assert";
import {Ticket} from "./configuration/impl/data";
import {ChannelTypes} from "discord.js/typings/enums";
import {HasIdentity} from "./types";

/**
 * The main bot class.
 * @author ZorTik
 */
export class TicketBot {

    public static JOIN_MESSAGE_KEY: string = "join-message";
    public static TICKET_IDS_KEY: string = "ticket-ids";
    public static USER_IDS_KEY: string = "user-ids";

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
     * Reloads the bot.
     * @param guild_ The guild to reload bot in.
     */
    async reload(guild_: Guild | string | null = null, handlerIds: string[] = []): Promise<string | null> {
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
    async runSetup(initChannel: TextChannel | null = null): Promise<string | null> {
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
        let errorMessage = await ticket.runSetup(guild);
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
    checkSetup(guildId: string): string | null {
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
    getGuildData(guild: Guild | string): Setup | null {
        let id = guild instanceof Guild?
            guild.id : guild as string;
        return <Setup | null>(this.guildData.has(id)?this.guildData.get(id) : null);
    }
    private async clearResources(guild: Guild, guildData: Setup | null | undefined): Promise<string | null> {
        if(guildData == null) {
            return "Guild is not loaded.";
        }
        const joinCanal: Canal = guildData.joinChannel;
        const mid = guildData.get(TicketBot.JOIN_MESSAGE_KEY);
        if(mid != null && joinCanal.isPresent()) {
            let djsC;
            if((djsC = await joinCanal.toDJSCanal(guild, this.bot)) != null) {
                await TicketBot.deleteInChannel(djsC, mid);
            }
        }
        let ids = guildData.getTicketIds();
        for (let id in ids) {
            this.bot.channels.fetch(id)
                .then(c => {
                    if(c != null && c.isText()) {
                        c.delete();
                    }
                })
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
    private supplyIfCanalMember<T>(channel: GuildChannel, action: (g: Guild, c: GuildChannel) => T | null): T | null {
        let guild = channel.guild;
        return guild != null ? action(guild, channel) : null;
    }
    private async fetchGuild(guild: Guild | string): Promise<Guild | null> {
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
export type TicketUsersRequirements = {
    userIds: string[];
}

export type TicketRequirements = {
    categoryId: string,
    creatorId: string;
}

export type ReloadHandler = ReloadHandlerEvent | (HasIdentity & ReloadHandlerEvent);

type ReloadHandlerEvent = {
    onReload: (guild: Guild, data: Setup) => Promise<string | null>;
}