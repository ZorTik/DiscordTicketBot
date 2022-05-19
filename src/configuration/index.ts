import * as fs from "fs";
import {Document, Node, parseDocument, stringify} from "yaml";
import {YamlDocumentNotLoadedError} from "./error";
import {Optional} from "../util";
import {Registry} from "../registry";
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
    join(): string {
        return this.all().join(FileConfiguration.LINE_SEP);
    }
    getPath(): string {
        return this.path;
    }
}
export class ValOpt<T> implements Optional<T> {
    readonly value: T | null;
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
            this.document.set(path, value);
        }
    }
    has(path: string): boolean {
        return this.from(doc1 => doc1.has(path)).isPresent();
    }
    getInt(path: string, def: number | null = null): ValOpt<number> {
        return this.get(path, def);
    }
    getStr(path: string, def: string | null = null): ValOpt<string> {
        return this.get(path, def)
    }
    get<T>(path: string, def: T | null = null): ValOpt<T> {
        return <ValOpt<T>>this.from(doc1 => {
            if(doc1.has(path)) {
                return doc1.get(path)
            } else return def;
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
        this.dataJson = JSON.parse(this.join());
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