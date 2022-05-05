const { Client, Intents } = require('discord.js');
const {YamlConfiguration} = require("./configuration/index.js");
const {DateTimeLogger} = require("./logging/index.js");
const logger = new DateTimeLogger();
const info = (message) => logger.info(message);
info("Loading configuration...");
const config = new YamlConfiguration("./config.yml");
function exit(message) {
    logger.err(message);
    process.exit(0);
}
const token = config.getStr("token").ifNotPresent(tkn => {
    exit("No token specified!");
});
const client = new Client({
    intents: [Intents.FLAGS.GUILDS]
});
client.on('ready', (e) => {
    const ts = new Date().getTime();
    const gDef = Array.from(e.guilds.cache.values())
        .find((g) => {
            return ts - g.joinedTimestamp <= 10000;
        })
    info("Successfully connected to " + (
        gDef != null
            ? gDef.name
            : "the server"
    ) + "!");
})
client.login(token.get());
export default info;