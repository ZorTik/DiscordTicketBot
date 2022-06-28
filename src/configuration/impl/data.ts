import {ChannelReference, JsonFileMap, ValOpt} from "../index";
import {KeyValueStorage} from "../../util";
import {ROLE_IDS_KEY, TICKET_IDS_KEY, USER_IDS_KEY} from "../../const";
import {Ticket, TicketRole, TicketUser} from "../../bot";

export class TicketBotData extends KeyValueStorage<string, any> {
    readonly source: JsonFileMap;
    readonly guildId: string;
    readonly joinChannel: SavedCanal;
    readonly ticketsCategory: SavedCanal;
    data: any;
    users?: SavedCollection<TicketUser>;
    roles?: SavedCollection<TicketRole>;
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
        this.roles?.save();
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
        this.users.filter = u => u.permissions.nodes.length > 0 || u.groups.length > 0;
        this.roles = new SavedCollection<TicketRole>(this.data, ROLE_IDS_KEY);
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
    getRole(roleId: string): TicketRole {
        if(this.roles == null) {
            throw new Error("Cannot get role before data are loaded!");
        }
        let role = this.roles?.find(r => r.roleId === roleId);
        if(role === undefined) {
            this.roles.push(role = new TicketRole(roleId));
            this.save();
        }
        return role;
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

export class SavedCanal extends ChannelReference {
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
    filter: (arg0: T) => boolean;
    saveTransformer: (arg0: T) => any;
    constructor(source: any, key: string,
                load: (arg0: any) => T = arg0 => <T>arg0,
                save: (arg0: T) => any = arg0 => arg0) {
        this.source = source;
        this.key = key;
        this.filter = () => true;
        this.saveTransformer = save;
        let arr;
        this.data = source.hasOwnProperty(key) && Array.isArray(arr = source[key])
            ? arr.map(load): [];
    }
    save() {
        this.source[this.key] = this.data
            .filter(this.filter)
            .map(this.saveTransformer);
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