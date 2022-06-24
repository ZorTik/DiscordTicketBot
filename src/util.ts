import {
    CommandInteraction,
    Interaction,
    InteractionReplyOptions,
    MessageActionRow,
    MessageComponentInteraction,
    MessageEmbed,
    MessagePayload
} from "discord.js";
import * as fs from "fs";
import {ReloadHandler} from "./bot";
import {bot, logger} from "./app";

export interface Optional<T> {
    value: T | null;
    isEmpty(): boolean;
    isPresent(): boolean;
    get(): T | null;
}
export abstract class KeyValueStorage<K, V> {
    abstract set(key: K, value: V): void;
    abstract get(key: K): V | null;
    hasKey(key: K): boolean {
        return this.get(key) != null;
    }
}
type ReplyInteraction = MessageComponentInteraction | CommandInteraction;
export async function replySuccess(interaction: ReplyInteraction, text: string, ephemeral: boolean = true) {
    return reply(interaction, new MessageEmbed()
        .setTitle("✓ Success!")
        .setDescription(text)
        .setColor("#2ad490"))
}
export async function replyError(interaction: ReplyInteraction, text: string, ephemeral: boolean = true) {
    return reply(interaction, new MessageEmbed()
        .setTitle("✕ Error!")
        .setDescription(text)
        .setColor("#d42a3e"))
}
export async function reply(interaction: ReplyInteraction, content: string | MessageEmbed | MessageActionRow, ephemeral: boolean = true): Promise<void> {
    let options: string | MessagePayload | InteractionReplyOptions = {ephemeral: ephemeral};
    if(typeof content === "string") {
        options["content"] = content
    } else if(content instanceof MessageEmbed) {
        options["embeds"] = [content];
    } else {
        options["components"] = [content];
    }
    return interaction.reply(options);
}

export function hasProperties(obj: any, props: string[]): boolean {
    for(let prop of props) {
        if(!obj.hasOwnProperty(prop)) return false;
    }
    return true;
}

export function readFilesRecursivelySync(dir: string, callback: (path: string, content: string) => void): void {
    let paths = getFilePathsRecursively(dir);
    for(let path of paths) {
        let content = fs.readFileSync(path, "utf8");
        callback(path, content);
    }
}
export async function loadModulesRecursively(dirParent: string): Promise<any[]> {
    let objs = [];
    for(let path of getFilePathsRecursively(`src/${dirParent}`)) {
        let pathSpl = path.split("/");
        if(pathSpl[pathSpl.length - 1].includes(".")) {
            let spl = path.split(".");
            spl = spl.slice(0, spl.length - 1);
            path = spl.join(".");
        }
        objs.push(await import(path.replace("src/", "./")));
    }
    return objs;
}
export function getFilePathsRecursively(dir: string): string[] {
    let paths: string[] = [];
    let files = fs.readdirSync(dir);
    for(let file of files) {
        let path = dir + "/" + file;
        let stat = fs.statSync(path);
        if(stat.isDirectory()) {
            paths.push(...getFilePathsRecursively(path));
        } else paths.push(path);
    }
    return paths;
}

export function isExactCommand(interaction: Interaction, cmdUrl: string): boolean {
    if(!interaction.isCommand()) return false;
    let spl = cmdUrl.split(".");
    for(let i = 0; i < spl.length; i++) {
        let part = spl[i];
        if((i == 0 && interaction.commandName !== part)
        || (i > 0 && interaction.options.getSubcommand() !== part)) {
            return false;
        }
    }
    return true;
}