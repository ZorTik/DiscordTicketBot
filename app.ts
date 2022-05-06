import {MainConfiguration} from "./configuration/impl/main.js";
import {Guild} from "discord.js";
import {TicketBot} from "./bot";
import {SetupData} from "./setup";
import {TicketBotData} from "./configuration/impl/data";

const { Client, Intents } = require('discord.js');
const {DateTimeLogger} = require("./logging/index.js");
export const logger = new DateTimeLogger();
export const info = (message) => logger.info(message);
info("Loading configuration...");
export const config = new MainConfiguration("./config.yml");
export const data = new TicketBotData("./data.json");
function exit(message) {
    logger.err(message);
    process.exit(0);
}
const token = config.getStr("token").ifNotPresent(() => {
    exit("No token specified!");
    return null;
});
export const client = new Client({
    intents: [Intents.FLAGS.GUILDS]
});
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
})
client.login(token.get());
