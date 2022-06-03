import {YamlConfiguration} from "../index";

export class MessagesConfiguration extends YamlConfiguration {
    constructor(path: string) {
        super(path);
        Message.ALL
            .forEach(m => {
                if(!this.has(m.key)) {
                    this.set(m.key, m.def);
                }
            })
    }
    message<T>(message: Message<T>, ...args: string[]): T {
        let _val = message.get(this);
        if(typeof _val === "string") {
            let val = <string>_val;
            args.forEach(arg => {
                val = val.replace("{}", arg);
            });
            _val = <T><unknown>val;
        }
        return _val;
    }
}
export class Message<T> {
    static SERVER_NOT_LOADED = new Message("server_not_loaded", "Server data are not loaded!");
    static BAD_CHANNEL = new Message("bad_channel", "This message is not in a right channel!");
    static JOIN_CANAL_SET = new Message("join_canal_set", "Join canal has been successfully set!");
    static TICKETS_CATEGORY_SET = new Message("tickets_category_set", "Tickets category has been successfully set!");
    static NOT_CHILD_CHANNEL = new Message("not_child_channel", "This message is not in a child text channel!");
    static SETUP_FINISH = new Message("setup_finish", "Ticket Bot is set up correctly and can be used now!");
    static SETUP_INCOMPLETE = new Message("setup_incomplete", "You need to set up everything before you can finish the setup! Error: %err");
    static ACTION_NOT_SUPPORTED = new Message("action_not_supported", "This action is not supported! :(");
    static SET = new Message("set", "✅ Set");
    static NOT_SET = new Message("not_set", "❌ Not Set");
    static SETUP_EMBED = {
        COMPLETE: {
            TITLE: new Message("setup_embed.complete.title", "Great! All is set up!"),
            DESC: new Message("setup_embed.complete.desc", "Ticket system is ready to be used!")
        },
        INCOMPLETE: {
            TITLE: new Message("setup_embed.incomplete.title", "Setup is not completed!"),
            DESC: new Message("setup_embed.incomplete.desc", "Ouch! Please check all your modules below and set missing\n" +
                "ones with /ticketsetup before accepting new tickets!")
        },
        FOOTER: new Message("setup_embed.footer", "Setup all requirements with /ticketsetup!"),
        SELECTION_MENU: {
            JOIN_CANAL: {
                LABEL: new Message("setup_embed.selection_menu.join_canal.label", "Set Join Canal"),
                DESC: new Message("setup_embed.selection_menu.join_canal.desc", "Sets this canal as main canal!")
            },
            TICKETS_CATEGORY: {
                LABEL: new Message("setup_embed.selection_menu.tickets_category.label", "Set Tickets Category"),
                DESC: new Message("setup_embed.selection_menu.tickets_category.desc", "Sets category this canal is in as the tickets category!")
            },
            FINISH_SETUP: {
                LABEL: new Message("setup_embed.selection_menu.finish_setup.label", "Finish Setup!"),
                DESC: new Message("setup_embed.selection_menu.finish_setup.desc", "Checks if all values all set and performs initial setup tasks!")
            }
        }
    }
    static ALL: Message<any>[] = [

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