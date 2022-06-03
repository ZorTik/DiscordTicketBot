import {
    EmbedFieldData, Guild, Interaction,
    MessageActionRow,
    MessageEmbed, MessageSelectMenu,
    SelectMenuInteraction, TextChannel
} from "discord.js";
import {Setup, SetupPart} from "../setup";
import {setFooter} from "../util/index";
import {bot, message, messages} from "../app";
import {reply, replySuccess} from "../util";
import {Message} from "../configuration/impl/messages";
const CHECK_SELECT_MENU_ID = "setup-check-select-menu";
export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        let setupData = bot.getGuildData(interaction.guild!!);
        if(setupData == null) {
            if(interaction.isCommand()) {
                await interaction.reply({
                    content: message(Message.SERVER_NOT_LOADED),
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
                await reply(interaction, message(Message.BAD_CHANNEL));
                return;
            }
            if(selected === "joinCanal") {
                data.getJoinCanal.set = channel.id;
                data.save();
                await replySuccess(interaction, message(Message.JOIN_CANAL_SET));
            } else if(selected === "ticketsCategory") {
                if(!(channel instanceof TextChannel) || channel.parentId == null) {
                    await reply(interaction, message(Message.NOT_CHILD_CHANNEL));
                    return;
                }
                data.getTicketsCategory.set = (await channel.fetch(true)).parentId!!;
                data.save();
                await replySuccess(interaction, message(Message.TICKETS_CATEGORY_SET));
            } else if(selected === "finish") {
                if(!(channel instanceof TextChannel)) return;
                let errMessage: string | null = bot.checkSetup(guild.id);
                if(errMessage == null) errMessage = "";
                if(await bot.runSetup(channel) == null) {
                    await replySuccess(interaction, message(Message.SETUP_FINISH));
                } else await reply(interaction, message(Message.SETUP_INCOMPLETE, errMessage));
            } else await reply(interaction, message(Message.ACTION_NOT_SUPPORTED));
            return;
        }
        if(interaction.isCommand() && interaction.commandName === "ticketsetup") {
            // TODO: Make setup handler.
            const options = interaction.options;
            if(options.getSubcommand() === "check") {
                const embedBuilder = new MessageEmbed();
                if(!setupData.isComplete()) {
                    embedBuilder.setTitle(message(Message.SETUP_EMBED.INCOMPLETE.TITLE));
                    embedBuilder.setDescription(message(Message.SETUP_EMBED.INCOMPLETE.DESC));
                    embedBuilder.setColor("#00ff99");
                } else {
                    embedBuilder.setTitle(message(Message.SETUP_EMBED.COMPLETE.TITLE));
                    embedBuilder.setDescription(message(Message.SETUP_EMBED.COMPLETE.DESC));
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
                                ? message(Message.SET)
                                : message(Message.NOT_SET),
                        }
                    });
                embedBuilder.setFields(fields);
                setFooter(embedBuilder, message(Message.SETUP_EMBED.FOOTER));
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
                                        label: message(Message.SETUP_EMBED.SELECTION_MENU.JOIN_CANAL.LABEL),
                                        description: message(Message.SETUP_EMBED.SELECTION_MENU.JOIN_CANAL.DESC),
                                        value: "joinCanal"
                                    },
                                    {
                                        label: message(Message.SETUP_EMBED.SELECTION_MENU.TICKETS_CATEGORY.LABEL),
                                        description: message(Message.SETUP_EMBED.SELECTION_MENU.TICKETS_CATEGORY.DESC),
                                        value: "ticketsCategory"
                                    },
                                    {
                                        label: message(Message.SETUP_EMBED.SELECTION_MENU.FINISH_SETUP.LABEL),
                                        description: message(Message.SETUP_EMBED.SELECTION_MENU.FINISH_SETUP.DESC),
                                        value: "finish"
                                    }
                                ]))
                    ]
                });
            } else {

            }
        }
    }
}