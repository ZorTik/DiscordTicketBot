import {ValOpt, YamlConfiguration} from "../index";
import {AnyChannel, Client, Guild, GuildBasedChannel} from "discord.js";
import {client} from "../../app";
import {Document} from "yaml";

export class MainConfiguration extends YamlConfiguration {
    constructor(path: string) {
        super(path);
    }
    getToken(): ValOpt<string> {
        return this.getStr("token");
    }
    getJoinCanal(): ValOpt<Canal> {
        return this.getCanal("canals.join-canal");
    }
    getTicketsSection(): ValOpt<Canal> {
        return this.getCanal("canals.tickets-section");
    }
    getCanal(path: string): ValOpt<Canal> {
        return this.from((doc: Document.Parsed) => {
            let id = <string>doc.get(path)
            return id != null ? new Canal(id) : null;
        });
    }
}
export class Canal {
    private readonly id: string;
    constructor(id: string) {
        this.id = id;
    }
    getId(): string {
        return this.id;
    }
    toDJSCanal(djsClient: Client = client): Promise<AnyChannel | null> {
        let channels = djsClient.channels;
        return channels.fetch(this.id);
    }
}