import {Setup} from "./setup";
import {
    AnyChannel,
    CategoryChannel,
    Client,
    ColorResolvable,
    Guild,
    GuildChannel,
    Message,
    MessageEmbed,
    NonThreadGuildBasedChannel,
    Snowflake,
    TextChannel
} from "discord.js";
import {client, exit, invokeStop, logger, message} from "./app";
import {Canal, JsonFileMap} from "./configuration";
import {DefaultLogger} from "./logging";
import {YamlMessage} from "./configuration/impl/messages";
import {setFooter} from "./util/index";
import assert from "assert";
import {Ticket, TicketData} from "./configuration/impl/data";
import {ChannelTypes} from "discord.js/typings/enums";

export class TicketBot {
    public static JOIN_MESSAGE_KEY: string = "join-message";
    public static TICKET_IDS_KEY: string = "ticket-ids";
    public static USER_IDS_KEY: string = "user-ids";

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
    async runSetup(initChannel: TextChannel | null = null): Promise<string | null> {
        let guild: Guild;
        if(initChannel instanceof GuildChannel && (guild = initChannel.guild) != null) {
            const guildData = this?.getGuildData(guild);
            let clearErrMessage = await this.clearResources(guild, guildData);
            if(clearErrMessage != null) return clearErrMessage;
            assert(guildData);
            let errMessage = this.checkSetup(guild.id);
            if(errMessage != null) return errMessage;
            let joinCanal = guildData.joinChannel;
            if(!guildData.isComplete() || !joinCanal.isPresent()) {
                return "Something went wrong.";
            }
            joinCanal.toDJSCanal(guild, this.bot)
                .then(async (c: AnyChannel | null) => {
                    if(c != null && c instanceof TextChannel) {
                        let joinMessage = await this.sendJoinMessage(c);
                        guildData.set(TicketBot.JOIN_MESSAGE_KEY, joinMessage.id);
                        guildData.save();
                    }
                })
            return null;
        }
        return Promise.reject("Guild is not loaded!");
    }
    async makeTicket(guild: Guild, requirements: TicketRequirements | TicketData): Promise<Ticket | string> {
        let guildData = this.getGuildData(guild);
        if(guildData == null || !guildData.isComplete()) {
            return "Setup is not completed. Please set up the bot with /tickets setup.";
        }
        let category = await guildData.ticketsCategory.toDJSCanal(guild, this.bot);
        let creator = await guild.members.fetch(requirements.creatorId);
        if(category == null || !(category instanceof CategoryChannel) || creator == null) {
            return "Category or creator are not present.";
        }
        let ticketChannel = await category.createChannel(`ticket-${creator.nickname}`, {
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
            creatorId: creator.id,
            userIds: requirements.userIds
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
    stop() {
        logger.info("Stopping...");
        invokeStop();
        exit();
    }
    getTickets(guildId: string): Ticket[] {
        return this.getGuildData(guildId)?.tickets?.data || [];
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
    private async clearResources(guild: Guild, guildData: Setup | null | undefined): Promise<string | null> {
        if(guildData == null) return "Guild is not loaded.";
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
    private async sendJoinMessage(c: TextChannel): Promise<Message> {
        let messages = message(YamlMessage.JOIN_EMBED.DESC)
            .split("%n");
        const embed = new MessageEmbed()
            .setTitle(message(YamlMessage.JOIN_EMBED.TITLE))
            .setDescription(messages.join("\n"))
            .setColor(<ColorResolvable>message(YamlMessage.JOIN_EMBED.COLOR));
        setFooter(embed, "Idk what to put here");
        return c.send({
            embeds: [embed]
        });
    }
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
export type TicketRequirements = {
    userIds: string[];
    creatorId: string;
}