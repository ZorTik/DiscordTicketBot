import {Interaction, SelectMenuInteraction} from "discord.js";
import {CATEGORIES_DROPDOWN_ID} from "../../const";
import {bot, config, message} from "../../app";
import {replyError, replySuccess} from "../../util";
import {YamlMessage} from "../../configuration/impl/messages";

export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        if(interaction.isSelectMenu() && interaction.customId === CATEGORIES_DROPDOWN_ID) {
            let menu = <SelectMenuInteraction>interaction;
            let selected = menu.values[0];
            let categoryOpt = config.getCategory(selected);
            if(categoryOpt.isPresent()) {
                let guild = menu.guild;
                if(guild == null) {
                    await err(interaction);
                    return;
                }
                let memberId = interaction.member?.user.id;
                if(memberId == null) {
                    await err(interaction);
                    return;
                }
                let ticket = await bot.makeTicket(guild, {
                    categoryId: categoryOpt.get()!!.identifier,
                    creatorId: memberId
                });
                if(typeof ticket !== "string") {
                    await replySuccess(interaction, message(YamlMessage.TICKET_CREATED, `<#${ticket.canalId}>`));
                    await bot.reload(guild, ["joinMessageHandler"]);
                } else await err(interaction, ticket);
            } else {
                await replyError(interaction, `Category ${selected} not found!`);
            }
        }
    }
}
async function err(interaction: SelectMenuInteraction, msg: string | null = null) {
    await replyError(interaction, msg == null ? message(YamlMessage.UNEXPECTED_ERROR) : msg);
}