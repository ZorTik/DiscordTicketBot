import {Interaction} from "discord.js";
import {isExactCommand, replyError, replySuccess} from "../../util";
import {bot, message} from "../../app";
import {YamlMessage} from "../../configuration/impl/messages";
import {groups} from "../../api/permission";

export = {
    on: 'interactionCreate',
    evt: async (interaction: Interaction) => {
        if(interaction.isCommand()) {
            if(isExactCommand(interaction, "tickets.assignusergroup")) {
                let guild = interaction.guild;
                if(guild != null) {
                    let user = interaction.options.getUser("user");
                    let groupIdentifier = interaction.options.getString("group");
                    let guildData = bot.getGuildData(guild);
                    if(guildData == null) {
                        await replyError(interaction, message(YamlMessage.SERVER_NOT_LOADED));
                        return;
                    }
                    if(user != null) {
                        let ticketUser = guildData.getUser(user.id);
                        let assign = groupIdentifier !== "_clear_";
                        let groupName = null;
                        if(assign) {
                            let group = groups().find(g => g.id === groupIdentifier);
                            if(group == undefined) {
                                await replyError(interaction, message(YamlMessage.GROUP_NOT_FOUND));
                                return;
                            }
                            groupName = group.name;
                            ticketUser.groups.push(group.id);
                        } else ticketUser.groups = [];
                        guildData.save();
                        await replySuccess(interaction, assign
                        ? message(YamlMessage.USER_GROUP_CHANGED, user.toString(), groupName || "Unknown")
                        : message(YamlMessage.USER_GROUPS_CLEARED, user.toString()));
                    }
                }
            } else if(isExactCommand(interaction, "tickets.assignrolegroup")) {
                let guild = interaction.guild;
                if(guild != null) {
                    let role = interaction.options.getRole("role");
                    let groupIdentifier = interaction.options.getString("group");
                    let guildData = bot.getGuildData(guild);
                    if(guildData == null) {
                        await replyError(interaction, message(YamlMessage.SERVER_NOT_LOADED));
                        return;
                    }
                    if(role != null) {
                        let ticketRole = guildData.getRole(role.id);
                        let assign = groupIdentifier !== "_clear_";
                        let groupName = null;
                        if(assign) {
                            let group = groups().find(g => g.id === groupIdentifier);
                            if(group == undefined) {
                                await replyError(interaction, message(YamlMessage.GROUP_NOT_FOUND));
                                return;
                            }
                            groupName = group.name;
                            ticketRole.groups.push(group.id);
                        } else ticketRole.groups = [];
                        guildData.save();
                        await replySuccess(interaction, assign
                            ? message(YamlMessage.ROLE_GROUP_CHANGED, role.toString(), groupName || "Unknown")
                            : message(YamlMessage.ROLE_GROUPS_CLEARED, role.toString()));
                    }
                }
            }
        }
    }
}