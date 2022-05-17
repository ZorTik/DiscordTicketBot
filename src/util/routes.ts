import {Routes} from "discord-api-types/v9";
import {config} from "../app";

export function appGuildCommands() {
    return Routes.applicationGuildCommands(
        config.getClient().get()?? "",
        config.getGuild().get()?? "",
    );
}