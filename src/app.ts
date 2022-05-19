import {MainConfiguration} from "./configuration/impl/main";
import {ClientEvents, Guild} from "discord.js";
import {TicketBot} from "./bot";
import {SetupData} from "./setup";
import {TicketBotData} from "./configuration/impl/data";
import * as fs from "fs";
import {SlashCommandBuilder, SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {RequestData, REST, RouteLike} from "@discordjs/rest";
import {Routes} from "discord-api-types/v9";
import {appGuildCommands} from "./util/routes";

const {Client, Intents} = require('discord.js');
const {DateTimeLogger} = require("./logging");
export const logger = new DateTimeLogger();
export const info = (message: string) => logger.info(message);
export const error = (message: string) => logger.err(message);
info("Loading configuration...");
export const config = new MainConfiguration("./config.yml");
export const data = new TicketBotData("./data.json");
export const client = new Client({intents: [Intents.FLAGS.GUILDS]});
export const rest = new REST({version: "9"});
export const bot = new TicketBot(new SetupData());
export function exit(message: string | null = null) {
    if(message != null) {
        logger.err(message);
    }
    process.exit(0);
}
const token = config.getStr("token").ifNotPresent(() => {
    exit("No token specified!");
    return null;
});
client.on('ready', (e: ClientEvents) => {
    const ts = new Date().getTime();
    const gDef = <Guild>Array.from(client.guilds.cache.values())
        .find((g) => {
            return ts - (g as Guild).joinedTimestamp <= 10000;
        })
    info("Successfully connected to " + (
        gDef != null
            ? gDef.name
            : "the server"
    ) + "!");
});
client.on('guildCreate', (g: Guild) => {
    let commandsJSON = [
        new SlashCommandBuilder()
            .setName("ticketsetup")
            .setDescription("Setup commands for Ticket Bot.")
            .addSubcommand(new SlashCommandSubcommandBuilder()
                .setName("check")
                .setDescription("Checks and shows if there is anything left to set up."))
    ].map(b => b.toJSON());
    rest.post(appGuildCommands(g), {body: commandsJSON})
        .then(() => {logger.info("Commands registered!")})
        .catch(logger.err);
});
client.on('guildDelete', (g: Guild) => {
    rest.get(appGuildCommands(g))
        .then((data) => {
            const promises = [];
            for (const cmd of data as Array<any>) {
                promises.push(rest.delete(<RouteLike>(Routes.applicationGuildCommands(
                    client.application.id,
                    g.id) + "/" + cmd.id)));
            }
            return Promise.all(promises);
        });
});
// Load events
fs.readdir("src/event", (err, files) => {
    if(err != null) {
        exit("Cannot load events! Error: " + err);
        return;
    }
    files.forEach(fileName => {
        if(fileName.endsWith(".js") || fileName.endsWith(".ts")) {
            const evt = require("src/event/" + (fileName.substring(0, fileName.length - 3)));
            client.on(evt.on, evt.evt);
        }
    });
});
try {
    client.login(token.get());
} catch (e) {
    exit("Cannot login client: " + (e as Error).message)
}
export function invokeStop() {

}