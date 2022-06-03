import {Guild, MessageEmbed} from "discord.js";
import {appGuildCommands} from "./routes";
import {logger, rest} from "../app";
import {SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder} from "@discordjs/builders";

export function setFooter(embed: MessageEmbed, info: string) {
    const date = new Date();
    embed.setFooter(date.getUTCDay()
        + ". " + date.getUTCMonth()
        + " " + date.getUTCFullYear()
        + " | " + info);
}
export function registerCommands(g: Guild, commands: SlashCommandBuilder[] | SlashCommandSubcommandsOnlyBuilder[]) {
    rest.put(appGuildCommands(g), {
        body: commands.map(c => c.toJSON()),
    })
        .then(() => {logger.info(`-- Commands for ${g.name} registered!`)})
        .catch(r => logger.err(r));
}