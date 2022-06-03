import {Setup} from "./setup";
import {
    AnyChannel,
    CategoryChannel,
    Client, Guild,
    GuildChannel,
    Message, MessageEmbed,
    NonThreadGuildBasedChannel, Snowflake,
    TextChannel
} from "discord.js";
import {client, exit, invokeStop, logger} from "./app";
import {Canal, JsonFileMap, ValOpt} from "./configuration";
import {DefaultLogger} from "./logging";

export class TicketBot {
    public static JOIN_MESSAGE_KEY: string = "join-message";
    public static TICKET_IDS_KEY: string = "ticket-ids";
    private readonly guildData: Map<string, Setup>;
    private readonly bot: Client;
    private readonly logger: DefaultLogger;
    private readonly storage: JsonFileMap;
    constructor(storage: JsonFileMap, bot: Client = client, _logger: DefaultLogger = logger) {
        this.logger = _logger;
        this.storage = storage;
        this.guildData = new Map<string, Setup>();
        bot.guilds.cache.forEach((g: Guild, key: Snowflake) => {
            this.initGuildData(key);
        });
        this.bot = bot;
    }
    async runSetup(initChannel: TextChannel | null = null): Promise<string | null> {
        let guild: Guild;
        if(initChannel instanceof GuildChannel && (guild = initChannel.guild) != null) {
            const guildData = this?.getGuildData(guild);
            if(guildData == null) return "Guild is not loaded.";
            const joinCanal: Canal = guildData.getJoinCanal;
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
            guildData.modifyTicketIds(ids => ids.splice(0, ids.length));
            let errMessage = this.checkSetup(guild.id);
            if(errMessage != null) {
                return errMessage;
            }
            if(guildData.isComplete() && joinCanal.isPresent()) {
                joinCanal.toDJSCanal(guild, this.bot)
                    .then((c: AnyChannel | null) => {
                        if(c != null) {
                            // TODO: Send join message
                        }
                    })
                return null;
            }
            return "Something went wrong.";
        }
        return Promise.reject("Guild is not loaded!");
    }
    checkSetup(guildId: string): string | null {
        let source = this.getGuildData(guildId);
        if(source == null) return "Guild is not loaded!";
        if(source.getJoinCanal.isEmpty()) {
            return "Join canal is not set!";
        } else if(source.getTicketsCategory.isEmpty()) {
            return "Tickets category is not set!";
        }
        return null;
    }
    stop() {
        logger.info("Stopping...");
        invokeStop();
        exit();
    }
    getGuild(guildId: string): Guild | undefined {
        return this.bot.guilds.cache
            .filter(g => g.id === guildId)
            .first();
    }
    getGuildData(guild: Guild | string): Setup | null {
        let id = guild instanceof Guild?
            guild.id : guild as string;
        return <Setup | null>(this.guildData.has(id)?this.guildData.get(id) : null);
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
    // TODO: Function of getting all ticket channels.
    private static deleteInChannel(channel: AnyChannel, id: string): Promise<any> {
        if(channel.isText()) {
            channel = <TextChannel>channel;
            return channel.messages.fetch(id)
                .then((m: Message) => {
                    if (m.deletable) {
                        return m.delete();
                    }
                });
        } else if(channel instanceof CategoryChannel) {
            channel = <CategoryChannel>channel;
            let member = null;
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