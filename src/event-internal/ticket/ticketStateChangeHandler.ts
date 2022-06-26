import {NotifySubscriber} from "../../event";
import {EVENTS} from "../../api/event";
import {Ticket, TicketData} from "../../bot";
import {STATES} from "../../api/state";
import {MessageActionRow, MessageButton, TextChannel} from "discord.js";
import {TICKET_USER_MARK_SOLVED_ID} from "../../const";

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
                // TODO: Handle new states.
                switch(newState.id) {
                    case STATES.SOLVED.id:
                        await editUserController(channel, ticketData, true);
                        break;
                    default:
                        await editUserController(channel, ticketData);
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