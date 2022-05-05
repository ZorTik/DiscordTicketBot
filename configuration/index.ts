import * as fs from "fs";
import {Document, Node, parseDocument} from "yaml";
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
        this.reload();
    }
    reload(): Boolean {
        if(!fs.existsSync(this.path)) {
            return false;
        }
        this.data = fs.readFileSync(this.path, "utf8")
            .split(FileConfiguration.LINE_SEP);
        return true;
    }
    allBy(pred: (T) => boolean): string[] {
        return this.all()
            .filter(pred);
    }
    first(pred: (T) => boolean): string | null {
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
    constructor(value: T = null) {
        this.value = value;
    }
    ifPresent<O>(cons: (T) => O, def: O = null) {
        return !this.isEmpty()
            ? cons(this.value)
            : def;
    }
    ifNotPresent<O>(cons: (T) => null): ValOpt<T> {
        if(!this.isPresent()) {
            cons(this.value);
        }
        return this;
    }
    isEmpty(): boolean {
        return this.value === null;
    }
    isPresent(): boolean {
        return !this.isEmpty();
    }
    get(): T | null {
        return this.ifPresent(o => o, null);
    }
}
export class YamlConfiguration extends FileConfiguration {
    private document: Document.Parsed
    public constructor(path: string) {
        super(path);
        this.reload();
    }
    reload(): Boolean {
        this.document = null;
        let success = super.reload();
        if(success) {
            this.document = parseDocument(this.join());
        }
        return success;
    }
    has(path: string): boolean {
        return this.from(doc1 => doc1.has(path)).isPresent();
    }
    getInt(path: string, def: number = null): ValOpt<number> {
        return this.get(path, def);
    }
    getStr(path: string, def: string = null): ValOpt<string> {
        return this.get(path, def)
    }
    get<T>(path: string, def: T = null): ValOpt<T> {
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
        return this.document;
    }
    private verifyLoaded() {
        if(this.document == null) {
            throw new YamlDocumentNotLoadedError(this);
        }
    }
}