import {GuildChannel, Interaction, MessageEmbed, TextChannel} from "discord.js";
import {isExactCommand, reply, replyError} from "../../util";
import {setFooter} from "../../util/index";
import {bot, message} from "../../app";
import {YamlMessage} from "../../configuration/impl/messages";
import {COLOR_SUCCESS} from "../../const";
import {Ticket} from "../../configuration/impl/data";

export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        if(interaction.isCommand() && isExactCommand(interaction, "ticket.admin")) {
            let channel = interaction.channel;
            if(channel == null || !channel.isText() || !(channel instanceof GuildChannel)) {
                await replyError(interaction, message(YamlMessage.BAD_CHANNEL));
                return;
            }
            let ticket: Ticket | undefined;
            if((ticket = bot.getTicket(channel.guild.id, channel)) == undefined) {
                await replyError(interaction, message(YamlMessage.NOT_TICKET_CHANNEL));
                return;
            }
            let embed = new MessageEmbed()
                .setTitle("Ticket Admin Panel")
                .setDescription(`You are curently in ticket <#${channel.id}>! Please select an action from dropdown menu below.`)
                .setColor(COLOR_SUCCESS);
            embed.setFields([
                {
                    name: "Category",
                    value: ticket.getCategory().mapIfPresent(c => c.name) || "Unknown",
                    inline: true
                },
                {
                    name: "Members",
                    value: ticket.getUsers().length.toString(),
                    inline: true
                }
            ]);
            setFooter(embed);
            await reply(interaction, embed);
            // TODO
        }
    }
}