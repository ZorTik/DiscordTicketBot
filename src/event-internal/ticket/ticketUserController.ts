import {NotifySubscriber} from "../../event";
import {Ticket} from "../../bot";
import {MessageActionRow, MessageButton, MessageEmbed, TextChannel} from "discord.js";
import {COLOR_SUCCESS, TICKET_USER_MARK_SOLVED_ID} from "../../const";
import {EVENTS} from "../../api/event";

const subs: NotifySubscriber = {
    evt: EVENTS.TICKET.CREATE,
    on: async (data: any) => {
        if(data instanceof Ticket) {
            let ticket = <Ticket>data;
            let c = await ticket.toDJSCanal(ticket.guildId);
            if(c instanceof TextChannel) {
                let channel = <TextChannel>c;
                let embed = new MessageEmbed()
                    .setTitle("Manage this Ticket")
                    .setDescription("Select options below to manage this ticket.")
                    .setColor(COLOR_SUCCESS);
                let message = await channel.send({
                    embeds: [embed],
                    components: [
                        new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setCustomId(TICKET_USER_MARK_SOLVED_ID)
                                .setLabel("Mark Solved")
                                .setStyle("SUCCESS"))
                    ]
                });
                ticket.ticketData.other.userControllerId = message.id;
                ticket.botData.save();
                // TODO: Ticket state management
            }
        }
    }
}
export = subs;