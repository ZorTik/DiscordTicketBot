import {SetupData} from "./setup";
import {
    AnyChannel,
    CategoryChannel,
    Client,
    GuildChannel,
    Message, MessageEmbed,
    NonThreadGuildBasedChannel,
    TextChannel
} from "discord.js";
import {Canal} from "./configuration/impl/main";
import {bot, client, data, exit, invokeStop, logger} from "./app";
import {ValOpt} from "./configuration";
import {TicketBotData} from "./configuration/impl/data";

export class TicketBot {
    private readonly setupData: SetupData;
    private readonly bot: Client;
    constructor(setupData: SetupData, bot: Client = client) {
        this.setupData = setupData;
        this.bot = bot;
    }
    async runSetup(initChannel: TextChannel = null): Promise<string | null> {
        const source = this.setupData.getSource();
        const joinCanal: ValOpt<Canal> = source.getJoinCanal();
        if(data.hasKey(TicketBotData.JOIN_MESSAGE_KEY) && joinCanal.isPresent()) {
            const mid: string = data.getJoinMessageId();
            let channel: AnyChannel = await joinCanal.get()
                .toDJSCanal(this.bot);
            await TicketBot.deleteInChannel(channel, mid);
        }
        if(data.hasKey(TicketBotData.TICKET_IDS_KEY)) {
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
        if(this.setupData.isComplete()) {
            joinCanal.get().toDJSCanal(this.bot)
                .then((c: AnyChannel) => {
                    // TODO: Send join message
                })
            return null;
        }
        return "Setup is not complete!";
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
    // TODO: Function of getting all ticket channels.
    private static deleteInChannel(channel: AnyChannel, id: string): Promise<any> {
        if(channel.isText) {
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