import {
    GuildChannel,
    Interaction,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    MessageSelectMenu
} from "discord.js";
import {isExactCommand, reply, replyError} from "../../util";
import {setFooter} from "../../util/index";
import {bot, message} from "../../app";
import {YamlMessage} from "../../configuration/impl/messages";
import {
    COLOR_SUCCESS,
    TICKET_ADMIN_DROPDOWN_ID,
    TICKET_USER_MARK_OPEN_ID,
    TICKET_USER_MARK_SOLVED_ID
} from "../../const";
import {doIfHasPermission} from "../../permissions";
import {PERMISSIONS} from "../../api/permission";
import assert from "assert";
import {Ticket} from "../../bot";
import {STATES} from "../../api/state";

export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        if(interaction.isCommand() && interaction.commandName === "ticket") {
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
            if(isExactCommand(interaction, "ticket.admin")) {
                await doIfHasPermission(interaction, PERMISSIONS.COMMANDS.TICKET_ADMIN, async () => {
                    assert(channel);
                    assert(ticket);
                    let embed = new MessageEmbed()
                        .setTitle(message(YamlMessage.TICKET.ADMIN_EMBED.TITLE))
                        .setDescription(message(YamlMessage.TICKET.ADMIN_EMBED.DESCRIPTION, `<#${channel.id}>`))
                        .setColor(COLOR_SUCCESS);
                    embed.setFields([
                        {
                            name: message(YamlMessage.TICKET.ADMIN_EMBED.FIELDS.CATEGORY.TITLE),
                            value: ticket.getCategory().mapIfPresent(c => c.name) || message(YamlMessage.TICKET.ADMIN_EMBED.FIELDS.CATEGORY.UNKNOWN),
                            inline: true
                        },
                        {
                            name: message(YamlMessage.TICKET.ADMIN_EMBED.FIELDS.STATE.TITLE),
                            value: ticket.ticketData.state.name,
                            inline: true
                        }
                    ]);
                    setFooter(embed);
                    await interaction.reply({
                        embeds: [embed],
                        components: [
                            new MessageActionRow()
                                .addComponents([
                                    new MessageButton()
                                        .setCustomId(TICKET_USER_MARK_OPEN_ID) // TODO: Make click handler.
                                        .setLabel(message(YamlMessage.TICKET.ADMIN_EMBED.BUTTONS.MARK_OPEN.LABEL))
                                        .setStyle("SUCCESS")
                                        .setDisabled(ticket.ticketData.state.id === STATES.OPEN.id),
                                    new MessageButton()
                                        .setCustomId(TICKET_USER_MARK_SOLVED_ID)
                                        .setLabel(message(YamlMessage.TICKET.ADMIN_EMBED.BUTTONS.MARK_SOLVED.LABEL))
                                        .setStyle("DANGER")
                                        .setDisabled(ticket.ticketData.state.id === STATES.SOLVED.id)
                                ]),
                            new MessageActionRow()
                                .addComponents(new MessageSelectMenu()
                                    .setCustomId(TICKET_ADMIN_DROPDOWN_ID)
                                    .setPlaceholder(message(YamlMessage.TICKET.ADMIN_EMBED.SELECTION_MENU.PLACEHOLDER))
                                    .addOptions([
                                        {
                                            label: message(YamlMessage.TICKET.ADMIN_EMBED.SELECTION_MENU.DELETE_TICKET.LABEL),
                                            description: message(YamlMessage.TICKET.ADMIN_EMBED.SELECTION_MENU.DELETE_TICKET.DESC),
                                            value: "delete"
                                        }
                                    ]))
                        ],
                        ephemeral: true
                    });
                });
            }
        }
    }
}