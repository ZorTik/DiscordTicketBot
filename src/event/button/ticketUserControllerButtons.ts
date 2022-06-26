import {ButtonInteraction, Interaction, MessageActionRow, MessageButton, TextChannel} from "discord.js";
import {TICKET_USER_MARK_SOLVED_ID} from "../../const";
import {bot, message} from "../../app";
import {replyError, replySuccess} from "../../util";
import {YamlMessage} from "../../configuration/impl/messages";
import {STATES} from "../../api/state";

export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        if(interaction.isButton() && interaction.customId === TICKET_USER_MARK_SOLVED_ID) {
            let btn = <ButtonInteraction>interaction;
            let channel = btn.channel;
            if(channel != null && bot.isTicketChannel(channel)) {
                channel = <TextChannel>channel;
                let ticket = bot.getTicket(channel.guild.id, channel);
                let ticketData = ticket?.ticketData;
                if(ticket == null || ticketData == null) {
                    await replyError(btn, message(YamlMessage.NOT_TICKET_CHANNEL));
                    return;
                }
                if(ticket.ticketData.state.id === STATES.SOLVED.id) {
                    await replyError(btn, "Ticket is already marked ad solved.");
                    return;
                }
                ticket.setState(STATES.SOLVED);
                await replySuccess(btn, "Ticket marked as solved.");
            }
        }
    }
}