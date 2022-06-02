import {Setup} from "./setup";
import {
    AnyChannel,
    CategoryChannel,
    Client, Guild,
    GuildChannel,
    Message, MessageEmbed,
    NonThreadGuildBasedChannel,
    TextChannel
} from "discord.js";
import {client, exit, invokeStop, logger} from "./app";
import {Canal, JsonFileMap, ValOpt} from "./configuration";
import {TicketBotData} from "./configuration/impl/data";
import {DefaultLogger} from "./logging";

export class TicketBot {
    private static JOIN_MESSAGE_KEY: string = "join-message";
    private readonly guildData: Map<string, Setup>;
    private readonly bot: Client;
    private readonly logger: DefaultLogger;
    private readonly storage: JsonFileMap;
    constructor(storage: JsonFileMap, bot: Client = client, _logger: DefaultLogger = logger) {
        this.logger = _logger;
        this.storage = storage;
        this.guildData = new Map<string, Setup>();
        bot.guilds.cache.forEach((g: Guild) => {
            this.initGuildData(g);
        })
        this.bot = bot;
    }
    async runSetup(initChannel: TextChannel | null = null): Promise<string | null> {
        let guild: Guild;
        if(initChannel instanceof GuildChannel && (guild = initChannel.guild) != null) {
            const setupData = this?.getGuildData(guild);
            if(setupData == null) return "Guild is not loaded.";
            const joinCanal: Canal = setupData.getJoinCanal;
            const mid = setupData.get(TicketBot.JOIN_MESSAGE_KEY);
            if(mid != null && joinCanal.isPresent()) {
                let djsC;
                if((djsC = await joinCanal.toDJSCanal(this.bot)) != null) {
                    await TicketBot.deleteInChannel(djsC, mid);
                }
            }
            if(setupData.hasKey(TicketBotData.TICKET_IDS_KEY)) {
                let ids = data.getTicketIds();
                if(ids != null) {
                    for (let id in ids) {
                        this.bot.channels.fetch(id)
                            .then(c => {
                                if(c != null && c.isText()) {
                                    c.delete();
                                }
                            })
                    }
                }
            }
            let errMessage = this.checkSetup();
            if(errMessage != null) {
                return errMessage;
            }
            if(setupData.isComplete() && joinCanal.isPresent()) {
                joinCanal.toDJSCanal(this.bot)
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
    checkSetup(): string | null {
        let source = this.setupData.getSource();
        if(source.getJoinCanal().isEmpty()) {
            return "Join canal is not set!";
        } else if(source.getTicketsSection().isEmpty()) {
            return "Tickets category is not set!";
        }
        return null;
    }
    setJoinCanal(canal: AnyChannel) {
        this.setupData.getSource().set("canals.join-canal", canal.id);
    }
    setTicketsSection(child: AnyChannel) {
        if(child instanceof GuildChannel && child.parentId != null) {
            this.setupData.getSource().set("canals.tickets-section", child.parentId);
        }
    }
    stop() {
        logger.info("Stopping...");
        invokeStop();
        exit();
    }
    getGuildData(guild: Guild | string): Setup | null {
        let id = guild instanceof Guild?
            guild.id : guild as string;
        return <Setup | null>(this.guildData.has(id)?this.guildData.get(id) : null);
    }
    private initGuildData(g: Guild): boolean {
        let data = new TicketBotData(this.storage, g.id);
        let reloaded = data.reload();
        if(reloaded) {
            this.guildData.set(g.id, new Setup(this.storage, g.id));
        }
        return reloaded;
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