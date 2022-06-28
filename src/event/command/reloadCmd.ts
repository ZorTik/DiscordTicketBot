import {Interaction} from "discord.js";
import {bot, config, logger, message, messages} from "../../app";
import {isExactCommand, replyError, replySuccess} from "../../util";
import {YamlMessage} from "../../configuration/impl/messages";

export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        let guild = interaction.guild!!;
        if(interaction.isCommand() && isExactCommand(interaction, "tickets.reload")) {
            messages.reload();
            config.reload();
            let err = await bot.reload(guild);
            await (err == null
                ? replySuccess(interaction, message(YamlMessage.BOT_RELOADED))
                : replyError(interaction, err));
        }
    }
}