import {MainConfiguration} from "../configuration/impl/main";
import {config, logger} from "../app"
export class SetupData {
    private readonly source: MainConfiguration;
    constructor(source: MainConfiguration = config) {
        this.source = source;
        if(!this.isComplete()) {
            logger.warn("Setup is not complete! Please complete setup with /tickets setup!")
        }
    }
    isComplete(): boolean {
        return SetupPart
            .vals().filter(f => !f.check(this))
            .length > 0;
    }
    getSource(): MainConfiguration {
        return this.source;
    }
}
export class SetupPart {
    public static JOIN_CANAL = new SetupPart("Join Canal",
        function(data: SetupData): boolean {return data.getSource().getJoinCanal().isPresent()});
    public static TICKETS_SECTION = new SetupPart("Tickets Category",
        function(data: SetupData): boolean {return data.getSource().getJoinCanal().isPresent()});
    public static vals(): SetupPart[] {
        return [this.JOIN_CANAL];
    }
    private readonly name: string;
    private readonly func;
    constructor(name: string, func: (arg: SetupData) => boolean) {
        this.name = name;
        this.func = func;
    }
    check(data: SetupData): boolean {
        return this.func(data);
    }
    getName(): string {
        return this.name;
    }

}