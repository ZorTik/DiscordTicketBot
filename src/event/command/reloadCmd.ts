import {Interaction} from "discord.js";
import {bot, config, logger, messages} from "../../app";
import {isExactCommand, replyError, replySuccess} from "../../util";

export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        let guild = interaction.guild!!;
        if(interaction.isCommand() && isExactCommand(interaction, "tickets.reload")) {
            messages.reload();
            config.reload();
            let err = await bot.reload(guild);
            await (err == null
                ? replySuccess(interaction, "Ticket Bot has been successfully Reloaded!")
                : replyError(interaction, err));
        }
    }
}