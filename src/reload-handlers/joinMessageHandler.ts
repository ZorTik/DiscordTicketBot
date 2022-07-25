import {ReloadHandler, TicketBot} from "../bot";
import {
    AnyChannel,
    BaseMessageComponentOptions,
    ColorResolvable, DiscordAPIError,
    Guild,
    Message,
    MessageActionRow, MessageActionRowOptions, MessageEmbed, MessageSelectMenu,
    TextChannel
} from "discord.js";
import {Setup} from "../setup";
import {config, message} from "../app";
import {YamlMessage} from "../configuration/impl/messages";
import {setFooter} from "../util/index";
import {TicketBotData} from "../configuration/impl/data";
import {CATEGORIES_DROPDOWN_ID, JOIN_MESSAGE_KEY} from "../const";

const handler: ReloadHandler = {
    id: "joinMessageHandler",
    onReload: async (guild: Guild, guildData: Setup) => {
        let joinCanal = guildData.joinChannel;
        if(!joinCanal.isPresent()) {
            return "Join canal is not set up!";
        }
        joinCanal.toDJSCanal(guild)
            .then(async (c: AnyChannel | null) => {
                if(c != null && c instanceof TextChannel) {
                    let mId = guildData.get(JOIN_MESSAGE_KEY);
                    let jm: Message | null = null;
                    if(mId != null) {
                        try {
                            jm = await c.messages.fetch(guildData.get(JOIN_MESSAGE_KEY), {
                                cache: false
                            });
                        } catch(ignored) {}
                    }
                    jm == null
                        ? await sendJoinMessage(c, guildData)
                        : await updateJoinMessage(c, guildData, jm);
                }
            });
        return null;
    }
};
async function sendJoinMessage(c: TextChannel, guildData: TicketBotData): Promise<Message> {
    let joinMessage = await c.send(buildJoinPayload(c));
    guildData.set(JOIN_MESSAGE_KEY, joinMessage.id);
    guildData.save();
    guildData.reload();
    return joinMessage;
}
async function updateJoinMessage(c: TextChannel, guildData: TicketBotData, m: Message) {
    try {
        return await m.edit(buildJoinPayload(c));
    } catch(e) {
        if(e instanceof DiscordAPIError && e.message.includes("Unknown Message")) {
            return await sendJoinMessage(c, guildData);
        }
    }
}
function buildJoinPayload(c: TextChannel) {
    return {
        embeds: [buildJoinEmbed(c)],
        components: buildJoinComponents(c)
    };
}
function buildJoinEmbed(c: TextChannel): MessageEmbed {
    let messages = message(YamlMessage.JOIN_EMBED.DESC)
        .split("%n");
    let embed = new MessageEmbed()
        .setTitle(message(YamlMessage.JOIN_EMBED.TITLE))
        .setDescription(messages.join("\n"))
        .setColor(<ColorResolvable>message(YamlMessage.JOIN_EMBED.COLOR));
    setFooter(embed, message(YamlMessage.JOIN_EMBED.FOOTER));
    return embed;

}
function buildJoinComponents(c: TextChannel): (MessageActionRow | (Required<BaseMessageComponentOptions> & MessageActionRowOptions))[] {
    let components = [];
    let categories = config.getCategories();
    if(categories.length > 0) {
        components.push(new MessageActionRow()
            .addComponents([
                new MessageSelectMenu()
                    .setCustomId(CATEGORIES_DROPDOWN_ID)
                    .setPlaceholder(message(YamlMessage.JOIN_EMBED.SELECTION_MENU.PLACEHOLDER))
                    .addOptions(categories
                        .map(c => {
                            return {
                                label: c.name,
                                description: c.description,
                                value: c.identifier
                            }
                        }))
            ]));
    }
    return components;
}
export = handler;