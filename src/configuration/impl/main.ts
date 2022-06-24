import {ValOpt, YamlConfiguration} from "../index";

export class MainConfiguration extends YamlConfiguration {
    constructor(path: string) {
        super(path);
    }
    getToken(): ValOpt<string> {
        return this.getStr("token");
    }
    getCategories(): TicketCategory[] { // TODO: Test and implement.
        return this.getKeys("categories").orElse([])
            .map(key => {
                return this.getObj("categories." + key).orElse(null);
            })
            .filter(obj => obj != null)
            .map(obj => <TicketCategory>obj);
    }
}

export type TicketCategory = {
    name: string;
    description: string;
}