import {Canal, JsonFileMap, ValOpt} from "../index";
import {KeyValueStorage} from "../../util";
import {TicketBot, TicketRequirements} from "../../bot";
import {
    Guild,
    GuildChannel,
    GuildMember,
    MessageEmbed,
    NonThreadGuildBasedChannel, Permissions,
    TextChannel,
    User
} from "discord.js";
import {bot, config, logger} from "../../app";
import {COLOR_INFO, TICKET_IDS_KEY, USER_IDS_KEY} from "../../const";
import {TicketCategory} from "./main";
import {PermissionHolder} from "../../permissions";

export class TicketBotData extends KeyValueStorage<string, any> {
    readonly source: JsonFileMap;
    readonly guildId: string;
    readonly joinChannel: SavedCanal;
    readonly ticketsCategory: SavedCanal;
    data: any;
    users?: SavedCollection<TicketUser>;
    tickets?: SavedCollection<Ticket>;
    constructor(source: JsonFileMap, guildId: string) {
        super();
        this.source = source;
        this.guildId = guildId;
        this.data = null;
        this.joinChannel = new SavedCanal(this, "joinCanal");
        this.ticketsCategory = new SavedCanal(this, "ticketsCategory");
    }
    save(): boolean {
        let data = this.data;
        if(data == null) return false;
        this.joinChannel.save();
        this.ticketsCategory.save();
        this.tickets?.save();
        this.users?.save();
        this.writeData(data);
        return true;
    }
    reload() {
        this.data = this.source.getByKey(this.guildId);
        if(this.data == null) {
            this.data = {};
            this.save();
        }
        this.joinChannel.load();
        this.ticketsCategory.load();
        this.tickets = new SavedCollection<Ticket>(this.data, TICKET_IDS_KEY,
            (data) => Ticket.saveIfAbsent(this, data), (ticket) => ticket.ticketData);
        this.users = new SavedCollection<TicketUser>(this.data, USER_IDS_KEY);
    }
    getUser(memberId: string): TicketUser {
        if(this.users == null) {
            throw new Error("Cannot get user before data are loaded!");
        }
        let user = this.users.find(u => u.getMemberId === memberId);
        if(user === undefined) {
            this.users.push(user = new TicketUser(memberId));
            this.save();
        }
        return user;
    }
    getTicket(canalId: string): ValOpt<Ticket> {
        if(this.tickets == null) {
            throw new Error("Cannot get ticket before data are loaded!");
        }
        return new ValOpt(this.tickets.find(t => t.canalId == canalId));
    }
    set(key: string, value: any) {
        this.data[key] = value;
        this.save();
    }
    get(key: string): any | null {
        return this.data.hasOwnProperty(key)
        ? this.data[key] : null;
    }
    getTicketIds(): string[] {
        return (this.tickets || []).map(t => t.canalId);
    }
    private writeData(data: any) {
        this.source.setByKey(this.guildId, data);
    }
}

export type TicketData = {
    canalId: string;
    categoryId: string,
    creatorId: string;
    userIds: string[];
}
export class Ticket extends Canal {

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

    private botData: TicketBotData;
    readonly guildId: string;
    readonly canalId: string;
    readonly ticketData: TicketData;
    private constructor(data: TicketBotData, ticketData: TicketData) {
        super(ticketData.canalId);
        this.botData = data;
        this.guildId = data.guildId;
        this.canalId = ticketData.canalId;
        this.ticketData = ticketData;
    }
    async runSetup(): Promise<string | null> {
        let channel = await this.fetchChannel();
        if(channel == null || !channel.isText()) {
            return "Channel of the ticket is not present!";
        }
        let userIds = [...this.ticketData.userIds, this.ticketData.creatorId];
        userIds.forEach(userId => {
            channel?.permissionOverwrites.edit(userId, {
                VIEW_CHANNEL: true,
            });
        });
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
    getUsers(): TicketUser[] {
        return this.ticketData.userIds.map(this.botData.getUser);
    }
    getCategory(): ValOpt<TicketCategory> {
        return config.getCategory(this.ticketData.categoryId);
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
        return g.members.fetch(this.memberId);
    }
}

export class SavedCanal extends Canal {
    private readonly ref: TicketBotData;
    private readonly key: string | null;
    constructor(ref: TicketBotData, key: string | null = null) {
        super();
        this.ref = ref;
        this.key = key;
    }
    save() {
        let data = this.ref.data;
        if(data != null && this.key != null) {
            data[this.key] = this.get() as string;
        }
    }
    load() {
        let data = this.ref.data;
        if(this.key != null && data.hasOwnProperty(this.key)) {
            this.value = data[this.key] as string;
        }
    }
    set set(newId: string) {
        if(this.key != null) {
            this.ref.set(this.key, newId);
        }
        super.set = newId;
    }
}

class SavedCollection<T> {
    private readonly source: any;
    private readonly key: string;
    readonly data: T[];
    saveTransformer: (arg0: T) => any;
    constructor(source: any, key: string,
                load: (arg0: any) => T = arg0 => <T>arg0,
                save: (arg0: T) => any = arg0 => arg0) {
        this.source = source;
        this.key = key;
        this.saveTransformer = save;
        let arr;
        this.data = source.hasOwnProperty(key) && Array.isArray(arr = source[key])
            ? arr.map(load): [];
    }
    save() {
        this.source[this.key] = this.data.map(this.saveTransformer);
    }
    find(pred: (arg0: T) => boolean): T | undefined {
        return this.data.find(pred);
    }
    map<U>(transform: (arg0: T) => U): U[] {
        return this.data.map(transform);
    }
    push(val: T): number {
        return this.data.push(val);
    }
    splice(start: number, deleteCount: number): T[] {
        return this.data.splice(start ,deleteCount);
    }
    remove(obj: T): boolean {
        let index = this.data.indexOf(obj);
        if(index > -1) {
            this.data.splice(index, 1);
            return true;
        }
        return false;
    }
    get length(): number {
        return this.data.length;
    }
}