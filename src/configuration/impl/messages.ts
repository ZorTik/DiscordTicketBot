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
    static JOIN_CANAL_SET = new YamlMessage("join_canal_set", "Join canal has been successfully set!");
    static TICKETS_CATEGORY_SET = new YamlMessage("tickets_category_set", "Tickets category has been successfully set!");
    static NOT_CHILD_CHANNEL = new YamlMessage("not_child_channel", "This message is not in a child text channel!");
    static SETUP_FINISH = new YamlMessage("setup_finish", "Ticket Bot is set up correctly and can be used now!");
    static SETUP_INCOMPLETE = new YamlMessage("setup_incomplete", "You need to set up everything before you can finish the setup! Error: %err");
    static TICKET_CREATED = new YamlMessage("ticket_created", "Ticket {} has been successfully created!%nPlease click on the link on this message to head up to your ticket and submit requirements.");
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
        SELECTION_MENU: {
            PLACEHOLDER: new YamlMessage("join_embed.selection_menu.placeholder", "Select a Category")
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