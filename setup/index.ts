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
    getSource(): MainConfiguration {
        return this.source;
    }
    isComplete(): boolean {
        return this.source.getJoinCanal().isPresent()
        && this.source.getTicketsSection().isPresent();
    }
}