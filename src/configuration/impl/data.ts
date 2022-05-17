import {JsonFileMap} from "../index";

export class TicketBotData extends JsonFileMap {
    static readonly JOIN_MESSAGE_KEY = "join-message-id";
    static readonly TICKET_IDS_KEY = "ticket-ids";
    constructor(path: string) {
        super(path);
    }
    addTicketId(id: string) {
        let ids = this.getTicketIds();
        if(ids == null) {
            return;
        }
        if(ids.indexOf(id) > -1) {
            return;
        }
        ids.push(id);
        this.setByKey(TicketBotData.TICKET_IDS_KEY, ids);
    }
    removeTicketId(id: string) {
        let ids = this.getTicketIds();
        if(ids == null) {
            return;
        }
        let index = ids.indexOf(id);
        if(index > -1) {
            ids.splice(index, 1);
        }
    }
    getJoinMessageId(): string | null {
        return this.getByKey(TicketBotData.JOIN_MESSAGE_KEY) as (string | null);
    }
    getTicketIds(): Array<string> | null {
        return this.getByKey(TicketBotData.TICKET_IDS_KEY) as Array<string> | null;
    }
}