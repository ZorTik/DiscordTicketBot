import {NotifySubscriber} from "../../event";
import {EVENTS} from "../../api/event";
import {Ticket} from "../../bot";
import {MessageEmbed} from "discord.js";
import {COLOR_INFO} from "../../const";

const subs: NotifySubscriber = {
    evt: EVENTS.TICKET.STATE_CHANGE,
    on: async (data: any) => {
        if(data instanceof Ticket) {
            let ticket = <Ticket>data;
            let newState = ticket.ticketData.state;
            let guild = await ticket.fetchGuild();
            if(guild != null) {
                let embed = new MessageEmbed()
                    .setTitle("Ticket State Changed")
                    .setDescription(`Ticket <#${ticket.canalId}> state has been changed to **${newState.name}**`)
                    .setColor(COLOR_INFO);
                for(let u of ticket.getUsers()) {
                    let m = await u.toDJSMember(guild);
                    if(m != null) {
                        m.send({
                            embeds: [embed]
                        });
                    }
                }
            }
        }
    }
}
export = subs;