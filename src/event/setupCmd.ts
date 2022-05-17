import {EmbedFieldData, Interaction, MessageEmbed} from "discord.js";
import {SetupData, SetupPart} from "../setup";
import {setFooter} from "../util";
const setupData = new SetupData();
module.exports = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        if(interaction.isCommand() && interaction.commandName === "ticketsetup") {
            // TODO: Make setup handler.
            const options = interaction.options;
            if(options.getSubcommand() === "check") {
                const embedBuilder = new MessageEmbed();
                if(!setupData.isComplete()) {
                    embedBuilder.setTitle("Setup is not completed!");
                    embedBuilder.setDescription("Ouch! Please check all your modules below and set missing\n" +
                        "ones with /ticketsetup before accepting new tickets!");
                    embedBuilder.setColor("#00ff99");
                } else {
                    embedBuilder.setTitle("Great! All is set up!");
                    embedBuilder.setDescription("Ticket system is ready to be used!");
                    embedBuilder.setColor("#ff0044");
                }
                let ind = 0;
                const fields: EmbedFieldData[] = SetupPart.vals()
                    .map(p => {
                        ind++;
                        return {
                            inline: ind == 3,
                            name: p.getName(),
                            value: p.check(setupData)
                                ? "✅ Set"
                                : "❌ Not Set"
                        }
                    });
                embedBuilder.setFields(fields);
                setFooter(embedBuilder, "Setup");
                await interaction.followUp({
                    embeds: [embedBuilder],
                    ephemeral: true
                });
            }
        }
    }
}