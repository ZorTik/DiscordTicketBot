import {YamlConfiguration} from "../index";

export class MessagesConfiguration extends YamlConfiguration {
    constructor(path: string) {
        super(path);
        YamlMessage.ALL
            .forEach(m => {
                if(!this.has(m.key)) {
                    this.set(m.key, m.def);
                }
            })
    }
    message<T>(message: YamlMessage<T>, ...args: string[]): T {
        let _val = message.get(this);
        if(typeof _val === "string") {
            let val = <string>_val;
            args.forEach(arg => {
                val = val.replace("{}", arg);
            });
            val = val.replace("%n", "\n");
            _val = <T><unknown>val;
        }
        return _val;
    }
}
export class YamlMessage<T> {
    static SERVER_NOT_LOADED = new YamlMessage("server_not_loaded", "Server data are not loaded!");
    static BAD_CHANNEL = new YamlMessage("bad_channel", "This message is not in a right channel!");
    static GROUP_NOT_FOUND = new YamlMessage("group_not_found", "Group with that identifier not found!");
    static JOIN_CANAL_SET = new YamlMessage("join_canal_set", "Join canal has been successfully set!");
    static TICKETS_CATEGORY_SET = new YamlMessage("tickets_category_set", "Tickets category has been successfully set!");
    static USER_GROUP_CHANGED = new YamlMessage("user_group_changed", "Group of user {} has been changed to {}!");
    static USER_GROUPS_CLEARED = new YamlMessage("user_groups_cleared", "Groups of user {} has been cleared!");
    static ROLE_GROUP_CHANGED = new YamlMessage("role_group_changed", "Group of role {} has been changed to {}!");
    static ROLE_GROUPS_CLEARED = new YamlMessage("role_groups_cleared", "Groups of role {} has been cleared!");
    static BOT_RELOADED = new YamlMessage("bot_reloaded", "Ticket Bot has been successfully Reloaded!");
    static NOT_CHILD_CHANNEL = new YamlMessage("not_child_channel", "This message is not in a child text channel!");
    static NOT_TICKET_CHANNEL = new YamlMessage("not_ticket_channel", "This message is not in a ticket channel!");
    static SETUP_FINISH = new YamlMessage("setup_finish", "Ticket Bot is set up correctly and can be used now!");
    static SETUP_INCOMPLETE = new YamlMessage("setup_incomplete", "You need to set up everything before you can finish the setup! Error: %err");
    static TICKET_CREATED = new YamlMessage("ticket_created", "Ticket {} has been successfully created!%nPlease click on the link on this message to head up to your ticket and submit requirements.");
    static TICKET_MARKED_SOLVED = new YamlMessage("ticket_marked_solved", "Ticket marked as solved.");
    static TICKET_ALREADY_MARKED_SOLVED = new YamlMessage("ticket_already_marked_solved", "Ticket is already marked as solved.");
    static TICKET_MARKED_OPEN = new YamlMessage("ticket_marked_open", "Ticket marked as open.");
    static TICKET_ALREADY_MARKED_OPEN = new YamlMessage("ticket_already_marked_open", "Ticket is already marked as open.");
    static ACTION_NOT_SUPPORTED = new YamlMessage("action_not_supported", "This action is not supported! :(");
    static UNEXPECTED_ERROR = new YamlMessage("unexpected_error", "An unexpected error has occured! Please contact admins.");
    static SET = new YamlMessage("set", "✅ Set");
    static NOT_SET = new YamlMessage("not_set", "❌ Not Set");
    static SETUP_EMBED = {
        COMPLETE: {
            TITLE: new YamlMessage("setup_embed.complete.title", "Great! All is set up!"),
            DESC: new YamlMessage("setup_embed.complete.desc", "Ticket system is ready to be used! You can now use Finish Setup action in selector below. You can also adjust or change all the settings and perform setup again.")
        },
        INCOMPLETE: {
            TITLE: new YamlMessage("setup_embed.incomplete.title", "Setup is not completed!"),
            DESC: new YamlMessage("setup_embed.incomplete.desc", "Ouch! Please check all your modules below and set missing\n" +
                "ones with /ticketsetup before accepting new tickets!")
        },
        FOOTER: new YamlMessage("setup_embed.footer", "Setup all requirements with /ticketsetup!"),
        SELECTION_MENU: {
            PLACEHOLDER: new YamlMessage("setup_embed.selection_menu.placeholder", "Available actions..."),
            JOIN_CANAL: {
                LABEL: new YamlMessage("setup_embed.selection_menu.join_canal.label", "Set Join Canal"),
                DESC: new YamlMessage("setup_embed.selection_menu.join_canal.desc", "Sets this canal as main canal!")
            },
            TICKETS_CATEGORY: {
                LABEL: new YamlMessage("setup_embed.selection_menu.tickets_category.label", "Set Tickets Category"),
                DESC: new YamlMessage("setup_embed.selection_menu.tickets_category.desc", "Sets category this canal is in as the tickets category!")
            },
            FINISH_SETUP: {
                LABEL: new YamlMessage("setup_embed.selection_menu.finish_setup.label", "Finish Setup!"),
                DESC: new YamlMessage("setup_embed.selection_menu.finish_setup.desc", "Checks if all values all set and performs initial setup tasks!")
            }
        }
    }
    static JOIN_EMBED = {
        TITLE: new YamlMessage("join_embed.title", "Create Ticket"),
        DESC: new YamlMessage("join_embed.description", ""),
        COLOR: new YamlMessage("join_embed.color", "#00ff99"),
        FOOTER: new YamlMessage("join_embed.footer", "To open ticket, select category below!"),
        SELECTION_MENU: {
            PLACEHOLDER: new YamlMessage("join_embed.selection_menu.placeholder", "Select a Category")
        }
    }
    static TICKET = {
        ADMIN_EMBED: {
            TITLE: new YamlMessage("ticket.admin_embed.title", "Ticket Admin Panel"),
            DESCRIPTION: new YamlMessage("ticket.admin_embed.description", "You are currently in ticket {}! Please select an action from dropdown menu below."),
            BUTTONS: {
                MARK_OPEN: {
                    LABEL: new YamlMessage("ticket.admin_embed.buttons.mark_open.label", "Mark Open"),
                },
                MARK_SOLVED: {
                    LABEL: new YamlMessage("ticket.admin_embed.buttons.mark_solved.label", "Mark Solved"),
                }
            },
            FIELDS: {
                CATEGORY: {
                    TITLE: new YamlMessage("ticket.admin_embed.fields.category.title", "Category"),
                    UNKNOWN: new YamlMessage("ticket.admin_embed.fields.category.unknown", "Unknown")
                },
                STATE: {
                    TITLE: new YamlMessage("ticket.admin_embed.fields.state.title", "Current State")
                }
            },
            SELECTION_MENU: {
                PLACEHOLDER: new YamlMessage("ticket.admin_embed.selection_menu.placeholder", "Select ticket Action"),
                DELETE_TICKET: {
                    LABEL: new YamlMessage("ticket.admin_embed.selection_menu.delete_ticket.label", "Delete Ticket"),
                    DESC: new YamlMessage("ticket.admin_embed.selection_menu.delete_ticket.desc", "Delete the ticket you are in.")
                }
            }
        },
        USER_EMBED: {
            TITLE: new YamlMessage("ticket.user_embed.title", "Manage this Ticket"),
            DESCRIPTION: new YamlMessage("ticket.user_embed.description", "Select options below to manage this ticket."),
            BUTTONS: {
                MARK_SOLVED: {
                    LABEL: new YamlMessage("ticket.user_embed.buttons.mark_solved.label", "Mark Solved"),
                }
            }
        }
    }
    static ALL: YamlMessage<any>[] = [

    ]
    readonly key: string;
    readonly def: T;
    constructor(key: string, def: T) {
        this.key = key;
        this.def = def;
    }
    get(conf: MessagesConfiguration): T {
        return conf.get(this.key, this.def)
            .orElse(this.def);
    }
}