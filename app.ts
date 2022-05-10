import {MainConfiguration} from "./configuration/impl/main.js";
import {Guild} from "discord.js";
import {TicketBot} from "./bot";
import {SetupData} from "./setup";
import {TicketBotData} from "./configuration/impl/data";
import * as fs from "fs";
import {SlashCommandBuilder, SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {REST} from "@discordjs/rest";
import {Routes} from "discord-api-types/v9";

const { Client, Intents } = require('discord.js');
const {DateTimeLogger} = require("./logging/index.js");
export const logger = new DateTimeLogger();
export const info = (message) => logger.info(message);
info("Loading configuration...");
export const config = new MainConfiguration("./config.yml");
export const data = new TicketBotData("./data.json");
export function exit(message: string = null) {
    if(message != null) {
        logger.err(message);
    }
    process.exit(0);
}
const token = config.getStr("token").ifNotPresent(() => {
    exit("No token specified!");
    return null;
});
export const client = new Client({intents: [Intents.FLAGS.GUILDS]});
export const rest = new REST({version: "9"});
export const bot = new TicketBot(new SetupData());
client.on('ready', (e) => {
    const ts = new Date().getTime();
    const gDef = <Guild>Array.from(e.guilds.cache.values())
        .find((g: Guild) => {
            return ts - g.joinedTimestamp <= 10000;
        })
    info("Successfully connected to " + (
        gDef != null
            ? gDef.name
            : "the server"
    ) + "!");
});
// Load commands
let commandsJSON = [
    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription("Setup commands for Ticket Bot.")
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("check")
            .setDescription("Checks and shows if there is anything left to set up."))
].map(b => b.toJSON());
rest.post(Routes.applicationGuildCommands(
    config.getClient().get(),
    config.getGuild().get(),
), {body: commandsJSON})
    .then(() => {logger.info("Commands registered!")})
    .catch(logger.err);
// Load events
fs.readdir("event", (err, files) => {
    if(err != null) {
        exit("Cannot load events! Error: " + err);
        return;
    }
    files.forEach(fileName => {
        if(fileName.endsWith(".js") || fileName.endsWith(".ts")) {
            require("event/" + fileName);
        }
    });
});
client.login(token.get());
export function invokeStop() {

}