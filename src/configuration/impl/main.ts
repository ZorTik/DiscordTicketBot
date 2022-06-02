import {ValOpt, YamlConfiguration} from "../index";

export class MainConfiguration extends YamlConfiguration {
    constructor(path: string) {
        super(path);
    }
    getToken(): ValOpt<string> {
        return this.getStr("token");
    }
}