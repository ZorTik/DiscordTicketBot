import {NotifySubscriber} from "../../event";
import {EVENTS} from "../../api/event";
import {Ticket, TicketData} from "../../bot";
import {STATES} from "../../api/state";
import {MessageActionRow, MessageButton, MessageEmbed, TextChannel} from "discord.js";
import {COLOR_PRIMARY, COLOR_SUCCESS, TICKET_USER_MARK_SOLVED_ID} from "../../const";
import {client} from "../../app";

const subs: NotifySubscriber = {
    evt: EVENTS.TICKET.STATE_CHANGE,
    on: async (data: any) => {
        if(data instanceof Ticket) {
            let ticket = <Ticket>data;
            let ticketData = ticket.ticketData;
            let newState = ticket.ticketData.state;
            let guild = await ticket.fetchGuild();
            let channel = await ticket.fetchChannel();
            if(guild != null && channel != null) {
                channel = <TextChannel>channel;
                let channelName = channel.name;
                let pts = channelName.split("-");
                switch(newState.id) {
                    case STATES.SOLVED.id:
                        await editUserController(channel, ticketData, true);
                        await ticket.setVisibility(false);
                        pts[1] = "solved";
                        await channel.setName(pts.join("-"));
                        break;
                    default:
                        await editUserController(channel, ticketData);
                        await ticket.setVisibility(true);
                        try {
                            pts[1] = ticket.getCategory().mapIfPresent(c => c.identifier) || "unknown";
                            await channel.setName(pts.join("-"));
                        } catch(ignored) {}
                }
                if(newState.id != STATES.OPEN.id) {
                    await channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setDescription(`Ticket is now **${newState.name}**`)
                                .setColor(COLOR_PRIMARY)
                        ]
                    });
                }
            }
        }
    }
}
async function editUserController(channel: TextChannel, ticketData: TicketData, markSolvedDisabled: boolean = false) {
    if(ticketData.other.hasOwnProperty("userControllerId")) {
        let userControllerId = ticketData.other.userControllerId;
        let userControllerMessage = await channel.messages.fetch(userControllerId);
        if(userControllerMessage != null) {
            await userControllerMessage.edit({
                components: [
                    new MessageActionRow()
                        .addComponents(new MessageButton()
                            .setCustomId(TICKET_USER_MARK_SOLVED_ID)
                            .setLabel("Mark Solved")
                            .setStyle("SUCCESS")
                            .setDisabled(markSolvedDisabled))
                ]
            });
        }
    }
}
export = subs;