import {Canal, JsonFileMap} from "../index";
import {KeyValueStorage} from "../../util";

export class TicketBotData extends KeyValueStorage<string, any> {
    readonly source: JsonFileMap;
    private readonly guildId: string;

    private readonly joinChannel: SavedCanal;
    private readonly ticketsCategory: SavedCanal;
    private data: any;
    constructor(source: JsonFileMap, guildId: string) {
        super();
        this.source = source;
        this.guildId = guildId;
        this.joinChannel = new SavedCanal(this);
        this.ticketsCategory = new SavedCanal(this);
        this.data = null;
        this.reload();
    }
    save(): boolean {
        let data = this.data;
        if(data == null) {
            return false;
        }
        this.source.setByKey(this.guildId, data);
        return true;
    }
    reload(): boolean {
        this.data = this.source.getByKey(this.guildId);
        let data = this.data;
        if(data != null) {
            this.joinChannel.load();
            this.ticketsCategory.load();
            return true;
        }
        return false;
    }
    set(key: string, value: any) {
        this.data[key] = value;
        this.save();
    }
    get(key: string): any | null {
        return this.data.hasOwnProperty(key)
        ? this.data[key] : null;
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
    get getData(): any {
        return this.data;
    }
}
export class SavedCanal extends Canal {
    private readonly ref: TicketBotData;
    private readonly key: string | null;
    constructor(ref: TicketBotData, key: string | null = null) {
        super(ref.getData != null && key != null
        ? ref.getData[key] : null);
        this.ref = ref;
        this.key = key;
    }
    load() {
        let data = this.ref.getData;
        if(this.key != null && data.hasOwnProperty()) {
            this.set = data[this.key] as string;
        }
    }
    set set(newId: string) {
        if(this.key != null) {
            this.ref.set(this.key, newId);
        }
        super.set = newId;
    }
}