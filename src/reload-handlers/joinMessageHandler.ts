import {ReloadHandler, TicketBot} from "../bot";
import {AnyChannel, ColorResolvable, Guild, Message, MessageEmbed, TextChannel} from "discord.js";
import {Setup} from "../setup";
import {message} from "../app";
import {YamlMessage} from "../configuration/impl/messages";
import {setFooter} from "../util/index";

const handler: ReloadHandler = async (guild: Guild, guildData: Setup) => {
    let joinCanal = guildData.joinChannel;
    if(!joinCanal.isPresent()) {
        return "Join canal is not set up!";
    }
    joinCanal.toDJSCanal(guild)
        .then(async (c: AnyChannel | null) => {
            if(c != null && c instanceof TextChannel) {
                let joinMessage = await sendJoinMessage(c);
                guildData.set(TicketBot.JOIN_MESSAGE_KEY, joinMessage.id);
                guildData.save();
            }
        });
    return null;
};
async function sendJoinMessage(c: TextChannel): Promise<Message> {
    let messages = message(YamlMessage.JOIN_EMBED.DESC)
        .split("%n");
    const embed = new MessageEmbed()
        .setTitle(message(YamlMessage.JOIN_EMBED.TITLE))
        .setDescription(messages.join("\n"))
        .setColor(<ColorResolvable>message(YamlMessage.JOIN_EMBED.COLOR));
    setFooter(embed, "Idk what to put here");
return c.send({
    embeds: [embed]
});
}
export {handler};