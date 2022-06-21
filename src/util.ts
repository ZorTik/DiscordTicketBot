import {
    InteractionReplyOptions,
    MessageActionRow,
    MessageComponentInteraction,
    MessageEmbed,
    MessagePayload
} from "discord.js";

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
export async function replySuccess(interaction: MessageComponentInteraction, text: string, ephemeral: boolean = true) {
    return reply(interaction, new MessageEmbed()
        .setTitle("✓ Success!")
        .setDescription(text)
        .setColor("#2ad490"))
}
export async function reply(interaction: MessageComponentInteraction, content: string | MessageEmbed | MessageActionRow, ephemeral: boolean = true): Promise<void> {
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