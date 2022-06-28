import {NotifySubscriber} from "../../event";
import {Ticket} from "../../bot";
import {MessageActionRow, MessageButton, MessageEmbed, TextChannel} from "discord.js";
import {COLOR_SUCCESS, TICKET_USER_MARK_SOLVED_ID} from "../../const";
import {EVENTS} from "../../api/event";
import {YamlMessage} from "../../configuration/impl/messages";
import {message} from "../../app";

const subs: NotifySubscriber = {
    evt: EVENTS.TICKET.CREATE,
    on: async (data: any) => {
        if(data instanceof Ticket) {
            let ticket = <Ticket>data;
            let c = await ticket.toDJSCanal(ticket.guildId);
            if(c instanceof TextChannel) {
                let channel = <TextChannel>c;
                let embed = new MessageEmbed()
                    .setTitle(message(YamlMessage.TICKET.USER_EMBED.TITLE))
                    .setDescription(message(YamlMessage.TICKET.USER_EMBED.DESCRIPTION))
                    .setColor(COLOR_SUCCESS);
                let msg = await channel.send({
                    embeds: [embed],
                    components: [
                        new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setCustomId(TICKET_USER_MARK_SOLVED_ID)
                                .setLabel(message(YamlMessage.TICKET.USER_EMBED.BUTTONS.MARK_SOLVED.LABEL))
                                .setStyle("SUCCESS"))
                    ]
                });
                ticket.ticketData.other.userControllerId = msg.id;
                ticket.botData.save();
            }
        }
    }
}
export = subs;