import {MessageEmbed} from "discord.js";

export function setFooter(embed: MessageEmbed, info: string) {
    const date = new Date();
    embed.setFooter(date.getUTCDay()
        + ". " + date.getUTCMonth()
        + " " + date.getUTCFullYear()
        + " | " + info);
}