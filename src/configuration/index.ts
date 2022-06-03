import * as fs from "fs";
import {Document, Node, parseDocument, stringify} from "yaml";
import {YamlDocumentNotLoadedError} from "./error";
import {Optional} from "../util";
import {Registry} from "../registry";
import {AnyChannel, Client, Guild} from "discord.js";
import {client} from "../app";
export interface Configuration {
    reload(): Boolean;
}
export class FileConfiguration implements Configuration, Registry<string> {
    private static LINE_SEP = "\n";
    private readonly path: string;
    private data: string[];
    public constructor(path: string) {
        this.path = path;
        this.data = [];
        this.reload();
    }
    save(): boolean {
        if(!fs.existsSync(this.path)) {
            return false;
        }
        fs.writeFileSync(this.path, this.join());
        return true;
    }
    reload(): Boolean {
        if(!fs.existsSync(this.path)) {
            return false;
        }
        this.data = fs.readFileSync(this.path, "utf8")
            .split(FileConfiguration.LINE_SEP);
        return true;
    }
    allBy(pred: (arg: string) => boolean): string[] {
        return this.all()
            .filter(pred);
    }
    first(pred: (arg: string) => boolean): string | null {
        let lines = this.allBy(pred);
        return lines.length > 0
            ? lines[0] : null;
    }
    all(): string[] {
        return this.data;
    }
    join(lineSep: string = FileConfiguration.LINE_SEP): string {
        return this.all().join(lineSep);
    }
    getPath(): string {
        return this.path;
    }
}
export class ValOpt<T> implements Optional<T> {
    value: T | null;
    constructor(value: T | null = null) {
        this.value = value;
    }
    mapIfPresent<O>(cons: (arg: T) => O, def: O | null = null): O | null {
        return !this.isEmpty()
            ? cons(this.value as T)
            : def;
    }
    ifPresent<O>(cons: (arg: T) => null, def: O | null = null) {
        !this.isEmpty()
            ? cons(this.value as T)
            : def;
    }
    ifNotPresent<O>(cons: () => null): ValOpt<T> {
        if(!this.isPresent()) {
            cons();
        }
        return this;
    }
    isEmpty(): boolean {
        return this.value === null;
    }
    isPresent(): boolean {
        return !this.isEmpty();
    }
    orElse(def: T): T {
        return this.get()?? def;
    }
    set set(value: T) {
        this.value = value;
    }
    get(): T | null {
        return this.mapIfPresent(o => o, null);
    }
}
export class YamlConfiguration extends FileConfiguration {
    private document: Document.Parsed | null;
    public constructor(path: string) {
        super(path);
        this.document = null;
        this.reload();
    }
    save(): boolean {
        fs.writeFileSync(this.getPath(), stringify(document));
        return true;
    }

    reload(): Boolean {
        this.document = null;
        let success = super.reload();
        if(success) {
            this.document = parseDocument(this.join());
        }
        return success;
    }
    set(path: string, value: unknown) {
        if(this.document != null) {
            if(path.includes(".")) {
                this.document.setIn(path.split("."), value);
            } else this.document.set(path, value);
        }
    }
    has(path: string): boolean {
        return this.from(doc1 => doc1.hasIn(path)).isPresent();
    }
    getInt(path: string, def: number | null = null): ValOpt<number> {
        return this.get(path, def);
    }
    getStr(path: string, def: string | null = null): ValOpt<string> {
        return this.get(path, def)
    }
    getCanal(path: string): ValOpt<Canal> {
        return this.from((doc: Document.Parsed) => {
            let id = <string>YamlConfiguration._getIn(doc, path);
            return id != null ? new Canal(id) : null;
        });
    }
    get<T>(path: string, def: T | null = null): ValOpt<T> {
        return <ValOpt<T>>this.from(doc1 => {
            let res = YamlConfiguration._getIn(doc1, path);
            if(res == null) res = def;
            return res;
        });
    }
    getKeys(path: string): ValOpt<string[]> {
        return this.from((doc) => {
            let jsSchema = doc.toJS();
            let pathParts = path.split("\\.");
            let current = jsSchema;
            for(let i = 0; i < pathParts.length; i++) {
                if(current[i] === undefined) {
                    return [];
                }
                current = current[i];
            }
            return Object.keys(current);
        });
    }
    from<T>(supplier: (doc: Document.Parsed) => T | null): ValOpt<T> {
        let doc = this.doc();
        return new ValOpt(supplier(doc));
    }
    doc(): Document.Parsed {
        this.verifyLoaded();
        return this.document as Document.Parsed;
    }
    private verifyLoaded() {
        if(this.document == null) {
            throw new YamlDocumentNotLoadedError(this);
        }
    }
    private static _getIn(doc: Document.Parsed, str: string): any {
        let path = str.includes(".");
        let contains = path
            ? doc.hasIn(str.split("."))
            : doc.has(str);
        return contains ? (path? doc.getIn(str.split(".")): doc.get(str)): null;
    }
}
export class JsonFileMap extends FileConfiguration {
    private dataJson: any;
    constructor(path: string) {
        super(path);
        this.dataJson = null;
        this.reload();
    }
    save(): boolean {
        fs.writeFileSync(this.getPath(), JSON.stringify(this.dataJson));
        return true;
    }

    reload(): Boolean {
        const success = super.reload();
        if(success) {
            this.dataJson = JSON.parse(this.join(""));
        }
        return success;
    }
    setByKey(key: string, value: any) {
        this.dataJson[key] = value;
        this.save();
    }
    getByKey(key: string): undefined | null {
        return this.hasKey(key)
            ? this.dataJson[key]
            : null;
    }
    hasKey(key: string): boolean {
        return this.dataJson.hasOwnProperty(key);
    }
}
export class Canal extends ValOpt<string> {
    getId(): string | null {
        return this.get();
    }
    async toDJSCanal(guild: Guild | string, djsClient: Client = client): Promise<AnyChannel | null> {
        let channelId: string | null;
        if((channelId = this.get()) == null) return Promise.reject("Channel id is not present.");
        if(typeof guild === "string") guild = await djsClient.guilds.fetch(guild);
        return await guild.channels.fetch(channelId);
    }
}