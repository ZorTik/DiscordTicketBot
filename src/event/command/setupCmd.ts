import {
    EmbedFieldData, Guild, Interaction,
    MessageActionRow,
    MessageEmbed, MessageSelectMenu,
    SelectMenuInteraction, TextChannel
} from "discord.js";
import {Setup, SetupPart} from "../../setup";
import {setFooter} from "../../util/index";
import {bot, message, messages} from "../../app";
import {isExactCommand, reply, replySuccess} from "../../util";
import {YamlMessage} from "../../configuration/impl/messages";
const CHECK_SELECT_MENU_ID = "setup-check-select-menu";
export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        let setupData = bot.getGuildData(interaction.guild!!);
        if(setupData == null) {
            if(interaction.isCommand()) {
                await interaction.reply({
                    content: message(YamlMessage.SERVER_NOT_LOADED),
                    ephemeral: true
                });
            }
            return;
        }
        if(interaction.isSelectMenu() && interaction.customId === CHECK_SELECT_MENU_ID) {
            let menu = <SelectMenuInteraction>interaction;
            let selected = menu.values[0];
            let guild: Guild | null;
            let data: Setup | null;
            if((guild = menu.guild) == null || (data = bot.getGuildData(guild)) == null) return;
            let channel = menu.channel;
            if(channel == null) {
                await reply(interaction, message(YamlMessage.BAD_CHANNEL));
                return;
            }
            if(selected === "joinCanal") {
                data.joinChannel.set = channel.id;
                data.save();
                await replySuccess(interaction, message(YamlMessage.JOIN_CANAL_SET));
            } else if(selected === "ticketsCategory") {
                if(!(channel instanceof TextChannel) || channel.parentId == null) {
                    await reply(interaction, message(YamlMessage.NOT_CHILD_CHANNEL));
                    return;
                }
                data.ticketsCategory.set = (await channel.fetch(true)).parentId!!;
                data.save();
                await replySuccess(interaction, message(YamlMessage.TICKETS_CATEGORY_SET));
            } else if(selected === "finish") {
                if(!(channel instanceof TextChannel)) return;
                let errMessage: string | null = bot.checkSetup(guild.id);
                if(errMessage == null && (errMessage = await bot.runSetup(channel)) == null) {
                    errMessage = "";
                }
                if(errMessage.length == 0) {
                    await replySuccess(interaction, message(YamlMessage.SETUP_FINISH));
                } else await reply(interaction, message(YamlMessage.SETUP_INCOMPLETE, errMessage));
            } else await reply(interaction, message(YamlMessage.ACTION_NOT_SUPPORTED));
            return;
        }
        if(interaction.isCommand() && isExactCommand(interaction, "tickets.setup")) {
            const embedBuilder = new MessageEmbed();
            if(!setupData.isComplete()) {
                embedBuilder.setTitle(message(YamlMessage.SETUP_EMBED.INCOMPLETE.TITLE));
                embedBuilder.setDescription(message(YamlMessage.SETUP_EMBED.INCOMPLETE.DESC));
                embedBuilder.setColor("#00ff99");
            } else {
                embedBuilder.setTitle(message(YamlMessage.SETUP_EMBED.COMPLETE.TITLE));
                embedBuilder.setDescription(message(YamlMessage.SETUP_EMBED.COMPLETE.DESC));
                embedBuilder.setColor("#ff0044");
            }
            let ind = 0;
            const fields: EmbedFieldData[] = SetupPart.vals()
                .map(p => {
                    ind++;
                    return {
                        inline: ind % 3 != 0,
                        name: p.getName(),
                        value: p.check(setupData!!)
                            ? message(YamlMessage.SET)
                            : message(YamlMessage.NOT_SET),
                    }
                });
            embedBuilder.setFields(fields);
            setFooter(embedBuilder, message(YamlMessage.SETUP_EMBED.FOOTER));
            await interaction.reply({
                embeds: [embedBuilder],
                ephemeral: true,
                components: [
                    new MessageActionRow()
                        .addComponents(new MessageSelectMenu()
                            .setCustomId(CHECK_SELECT_MENU_ID)
                            .setPlaceholder("Available actions...")
                            .addOptions([
                                {
                                    label: message(YamlMessage.SETUP_EMBED.SELECTION_MENU.JOIN_CANAL.LABEL),
                                    description: message(YamlMessage.SETUP_EMBED.SELECTION_MENU.JOIN_CANAL.DESC),
                                    value: "joinCanal"
                                },
                                {
                                    label: message(YamlMessage.SETUP_EMBED.SELECTION_MENU.TICKETS_CATEGORY.LABEL),
                                    description: message(YamlMessage.SETUP_EMBED.SELECTION_MENU.TICKETS_CATEGORY.DESC),
                                    value: "ticketsCategory"
                                },
                                {
                                    label: message(YamlMessage.SETUP_EMBED.SELECTION_MENU.FINISH_SETUP.LABEL),
                                    description: message(YamlMessage.SETUP_EMBED.SELECTION_MENU.FINISH_SETUP.DESC),
                                    value: "finish"
                                }
                            ]))
                ]
            });
        }
    }
}