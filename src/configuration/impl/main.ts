import {ValOpt, YamlConfiguration} from "../index";

export class MainConfiguration extends YamlConfiguration {
    constructor(path: string) {
        super(path);
    }
    getToken(): ValOpt<string> {
        return this.getStr("token");
    }
    getCategory(id: string): ValOpt<TicketCategory> {
        return new ValOpt<TicketCategory>(this.getCategories().find(c => c.identifier === id));
    }
    getCategories(): TicketCategory[] { // TODO: Test and implement.
        return this.getKeys("categories").orElse([])
            .map(key => {
                return [key, this.getObj("categories." + key).orElse(null)];
            })
            .filter(obj => obj[1] != null)
            .map(obj => {
                let key = obj[0];
                let val: any = obj[1];
                val.identifier = key;
                return <TicketCategory>val;
            });
    }
}

export type TicketCategory = {
    identifier: string;
    name: string;
    description: string;
}