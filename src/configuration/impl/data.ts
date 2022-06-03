import {Canal, JsonFileMap} from "../index";
import {KeyValueStorage} from "../../util";
import {TicketBot} from "../../bot";

export class TicketBotData extends KeyValueStorage<string, any> {
    readonly source: JsonFileMap;
    private readonly guildId: string;
    private readonly joinChannel: SavedCanal;
    private readonly ticketsCategory: SavedCanal;
    private tickets: Ticket[];
    private data: any;
    constructor(source: JsonFileMap, guildId: string) {
        super();
        this.source = source;
        this.guildId = guildId;
        this.data = null;
        this.joinChannel = new SavedCanal(this, "joinCanal");
        this.ticketsCategory = new SavedCanal(this, "ticketsCategory");
        this.tickets = [];
    }
    save(): boolean {
        let data = this.data;
        if(data == null) {
            return false;
        }
        this.data[TicketBot.TICKET_IDS_KEY] = this.tickets
            .map(t => t.getCanalId);
        this.joinChannel.save();
        this.ticketsCategory.save();
        this.source.setByKey(this.guildId, data);
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
        this.loadTickets();
    }
    set(key: string, value: any) {
        this.data[key] = value;
        this.save();
    }
    get(key: string): any | null {
        return this.data.hasOwnProperty(key)
        ? this.data[key] : null;
    }
    modifyTicketIds(action: (ids: string[]) => void) {
        this.save();
        let ids = this.getTicketIds();
        action(ids);
        this.set(TicketBot.TICKET_IDS_KEY, ids);
        this.loadTickets();
    }
    getTicketIds(): string[] {
        let obj = this.get(TicketBot.TICKET_IDS_KEY);
        return obj != null ? <string[]>obj : [];
    }
    get getJoinCanal(): Canal {
        return this.joinChannel;
    }
    get getTicketsCategory(): Canal {
        return this.ticketsCategory;
    }
    get getSource(): JsonFileMap {
        return this.source;
    }
    get getData(): any | null {
        return this.data;
    }
    private loadTickets() {
        this.tickets = this.getTicketIds()
            .map(id => new Ticket(this.guildId, id));
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
        let data = this.ref.getData;
        if(data != null && this.key != null) {
            data[this.key] = this.get() as string;
        }
    }
    load() {
        let data = this.ref.getData;
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
export class Ticket extends Canal {
    private readonly guildId: string;
    private readonly canalId: string;
    constructor(guildId: string, canalId: string) {
        super(canalId);
        this.guildId = guildId;
        this.canalId = canalId;
    }
    get getCanalId(): string {
        return this.canalId;
    }
}