import {Routes} from "discord-api-types/v9";
import {client, config} from "../app";
import {Guild} from "discord.js";

export function appGuildCommands(g: Guild | string) {
    let gId = g instanceof Guild ? g.id : <string>g;
    return Routes.applicationGuildCommands(
        client.application.id,
        gId,
    );
}