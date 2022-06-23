import {logger} from "./app"
import {JsonFileMap} from "./configuration";
import {TicketBotData} from "./configuration/impl/data";
export class Setup extends TicketBotData {
    constructor(source: JsonFileMap, guildId: string) {
        super(source, guildId);
        this.reload();
        if(!this.isComplete()) {
            logger.warn("Setup is not complete! Please complete setup with /ticketsetup!")
        }
    }
    isComplete(): boolean {
        return SetupPart
            .vals().filter(f => !f.check(this))
            .length == 0;
    }
}
export class SetupPart {
    public static JOIN_CANAL = new SetupPart("Join Canal",
        function(data: Setup): boolean {return data.joinChannel.isPresent()});
    public static TICKETS_SECTION = new SetupPart("Tickets Category",
        function(data: Setup): boolean {return data.ticketsCategory.isPresent()});
    public static vals(): SetupPart[] {
        return [this.JOIN_CANAL, this.TICKETS_SECTION];
    }
    private readonly name: string;
    private readonly func;
    constructor(name: string, func: (arg: Setup) => boolean) {
        this.name = name;
        this.func = func;
    }
    check(data: Setup): boolean {
        return this.func(data);
    }
    getName(): string {
        return this.name;
    }
}