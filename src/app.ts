import {MainConfiguration} from "./configuration/impl/main";
import {ApplicationCommand, ClientEvents, Guild, Snowflake} from "discord.js";
import {TicketBot} from "./bot";
import * as fs from "fs";
import {SlashCommandBuilder, SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {REST, RouteLike} from "@discordjs/rest";
import {Routes} from "discord-api-types/v9";
import {appGuildCommands} from "./util/routes";
import {registerCommands} from "./util/index";
import {JsonFileMap} from "./configuration";
import {Message, MessagesConfiguration} from "./configuration/impl/messages";

const {Client, Intents} = require('discord.js');
const {DateTimeLogger} = require("./logging");
export const logger = new DateTimeLogger();
export const info = (message: string) => logger.info(message);
export const error = (message: string) => logger.err(message);
info("Loading configuration...");
export const config = new MainConfiguration("./config.yml");
export const messages = new MessagesConfiguration("./messages.yml");
export const client = new Client({intents: [Intents.FLAGS.GUILDS]});
export const rest = new REST({version: "9"});
export var bot: TicketBot;
export function message<T>(message: Message<T>, ...args: string[]): T {
    return messages.message(message, ...args);
}
export function exit(message: string | null = null) {
    if(message != null) {
        logger.err(message);
    }
    process.exit(0);
}
const token = config.getToken().ifNotPresent(() => {
    exit("No token specified!");
    return null;
});
rest.setToken(<string>token.get());
let commands = [
    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription("Setup commands for Ticket Bot.")
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("check")
            .setDescription("Checks and shows if there is anything left to set up."))
];
client.on('ready', (e: ClientEvents) => {
    const ts = new Date();
    const gDef = <Guild>Array.from(client.guilds.cache.values())
        .find((g) => {
            return ts.getMilliseconds() - (g as Guild).joinedAt.getMilliseconds() <= 10000;
        })
    info("Successfully connected to " + (
        gDef != null
            ? gDef.name
            : "the server"
    ) + "!");
});
client.on('guildCreate', (g: Guild) => {
    // Guild bot initial logic
    registerCommands(g, commands);
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
            import("./event/" + (fileName.substring(0, fileName.length - 3)))
                .then(evt => {
                    client.on(evt["on"], evt["evt"]);
                });
        }
    });
});
let dataPath = "./data.json";
if(!fs.existsSync(dataPath)) {
    exit("File data.json does not exist!");
}
try {
    client.login(token.get())
        .then(() => {
            // Bot dependent initialization logic.
            logger.info("Loading bot...");
            bot = new TicketBot(new JsonFileMap(dataPath), client);
            client.guilds.cache
                .forEach((g: Guild) => {
                    let toReg = commands.filter(c => {
                        return g.commands.cache.filter((c2: ApplicationCommand) => c.name === c2.name)
                            .size == 0;
                    });
                    registerCommands(g, toReg);
                });
        });
} catch (e) {
    exit("Cannot login client: " + (e as Error).message)
}
export function invokeStop() {

}