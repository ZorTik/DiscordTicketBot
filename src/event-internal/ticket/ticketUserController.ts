import {NotifySubscriber} from "../../event";
import {Ticket} from "../../bot";
import {MessageEmbed, TextChannel} from "discord.js";
import {COLOR_SUCCESS} from "../../const";
import {EVENTS} from "../../api/event";

const subs: NotifySubscriber = {
    id: EVENTS.TICKET.CREATE,
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
                await channel.send({
                    embeds: [embed]
                });
                // TODO: Ticket state management
            }
        }
    }
}
export = subs;