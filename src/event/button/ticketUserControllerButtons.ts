import {ButtonInteraction, Interaction, MessageActionRow, MessageButton, TextChannel} from "discord.js";
import {TICKET_USER_MARK_OPEN_ID, TICKET_USER_MARK_SOLVED_ID} from "../../const";
import {bot, message} from "../../app";
import {replyError, replySuccess} from "../../util";
import {YamlMessage} from "../../configuration/impl/messages";
import {STATES} from "../../api/state";

export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        if(interaction.isButton()) {
            let btn = <ButtonInteraction>interaction;
            let channel = btn.channel;
            if(channel == null) return;
            if(bot.isTicketChannel(channel)) {
                channel = <TextChannel>channel;
                let ticket = bot.getTicket(channel.guild.id, channel);
                let ticketData = ticket?.ticketData;
                if(ticket == null || ticketData == null) {
                    await replyError(btn, message(YamlMessage.NOT_TICKET_CHANNEL));
                    return;
                }
                if(interaction.customId === TICKET_USER_MARK_SOLVED_ID) {
                    if(ticket.ticketData.state.id === STATES.SOLVED.id) {
                        await replyError(btn, message(YamlMessage.TICKET_ALREADY_MARKED_SOLVED));
                        return;
                    }
                    ticket.setState(STATES.SOLVED);
                    await replySuccess(btn, message(YamlMessage.TICKET_MARKED_SOLVED));
                } else if(interaction.customId === TICKET_USER_MARK_OPEN_ID) {
                    if(ticket.ticketData.state.id === STATES.OPEN.id) {
                        await replyError(btn, message(YamlMessage.TICKET_ALREADY_MARKED_OPEN));
                        return;
                    }
                    ticket.setState(STATES.OPEN);
                    await replySuccess(btn, message(YamlMessage.TICKET_MARKED_OPEN));
                }
            }
        }
    }
}