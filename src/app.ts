import {MainConfiguration} from "./configuration/impl/main";
import {ApplicationCommand, ClientEvents, Guild} from "discord.js";
import {ReloadHandler, TicketBot} from "./bot";
import * as fs from "fs";
import {SlashCommandBuilder, SlashCommandSubcommandBuilder} from "@discordjs/builders";
import {REST, RouteLike} from "@discordjs/rest";
import {Routes} from "discord-api-types/v9";
import {appGuildCommands} from "./util/routes";
import {registerCommands} from "./util/index";
import {JsonFileMap} from "./configuration";
import {MessagesConfiguration, YamlMessage} from "./configuration/impl/messages";
import {hasProperties, loadModulesRecursively} from "./util";
import {groups} from "./api/permission";
import {ActivityTypes} from "discord.js/typings/enums";
import {STATES} from "./api/state";

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
export function message<T>(message: YamlMessage<T>, ...args: string[]): T {
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
        .setName("tickets")
        .setDescription("General commands for Ticket Bot.")
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("setup")
            .setDescription("Performs setup check and offers some actions to take."))
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("reload")
            .setDescription("Reloads the bot."))
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("setgroup")
            .setDescription("Manages player's tickets group.")
            .addUserOption(option => option.setName("user")
                .setDescription("User to modify group for")
                .setRequired(true))
            .addStringOption(option => option.setName("group")
                .setDescription("Group to set to the user")
                .setRequired(true)
                .addChoices(...groups()
                    .map(g => {
                        return { name: g.name, value: g.id }
                    }), { name: "* Clear Groups *", value: "_clear_" }))),
    new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Ticket/User in ticket manipulation commands.")
        .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName("admin")
            .setDescription("Ticket administration."))
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
loadModulesRecursively("event").then(modules => modules.forEach(evt => {
    if(!hasProperties(evt, ["on", "evt"])) {
        return;
    }
    client.on(evt["on"], evt["evt"]);
}))
let dataPath = "./data.json";
if(!fs.existsSync(dataPath)) {
    logger.info("File data.json does not exist! Creating a new one...");
    try {
        fs.writeFileSync(dataPath, "{}")
    } catch(e) {
        exit("Cannot create data.json! Error: " + e);
    }
}
try {
    client.login(token.get())
        .then(async () => {
            // Bot dependent initialization logic.
            logger.info("Connecting to servers...");
            bot = new TicketBot(new JsonFileMap(dataPath), client);
            client.guilds.cache
                .forEach((g: Guild) => {
                    let toReg = commands.filter(c => {
                        return g.commands.cache.filter((c2: ApplicationCommand) => c.name === c2.name)
                            .size == 0;
                    });
                    registerCommands(g, toReg);
                });
            (await loadModulesRecursively("reload-handlers")).forEach(obj => {
                let rh = <ReloadHandler>obj;
                if(rh != null) {
                    bot.reloadHandlers.push(rh);
                }
            });
            await bot.reload();
            function updateActivity() {
                let user = client.user;
                if(user != null) {
                    let ticketsCount = 0;
                    client.guilds.cache.forEach((g: Guild) => {
                        ticketsCount += bot.getTickets(g.id)
                            .filter(t => t.ticketData.state.id === STATES.OPEN.id).length;
                    });
                    user.setActivity(`${ticketsCount} tickets`, {
                        type: ActivityTypes.WATCHING
                    });
                }
            }
            updateActivity();
            setInterval(updateActivity, 30000);
        });
} catch (e) {
    exit("Cannot login client: " + (e as Error).message)
}
export function invokeStop() {
    bot.guildData.forEach(gd => {
        logger.info(`Saving data for guild ${gd.guildId}...`)
        gd.save();
    });
}