import {Interaction, SelectMenuInteraction} from "discord.js";
import {TICKET_ADMIN_DROPDOWN_ID} from "../../const";
import {bot, message} from "../../app";
import {replyError} from "../../util";
import {YamlMessage} from "../../configuration/impl/messages";

export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        if(interaction.isSelectMenu() && interaction.customId === TICKET_ADMIN_DROPDOWN_ID) {
            let menu = <SelectMenuInteraction>interaction;
            let selected = menu.values[0];
            if(selected === "delete") {
                let guild = interaction.guild;
                let channel = interaction.channel;
                if(guild != null && channel != null) {
                    let ticket = bot.getTicket(guild.id, channel);
                    if(ticket == null) {
                        await err(interaction, message(YamlMessage.NOT_TICKET_CHANNEL));
                        return;
                    }
                    let success = await ticket.delete();
                    if(success) {
                        // TODO
                    }
                }
            } else await err(interaction, "Unknown Action.");
            await err(interaction, message(YamlMessage.UNEXPECTED_ERROR));
        }
    }
}
async function err(interaction: SelectMenuInteraction, msg: string | null = null) {
    await replyError(interaction, msg == null ? message(YamlMessage.UNEXPECTED_ERROR) : msg);
}