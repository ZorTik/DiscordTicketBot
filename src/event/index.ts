import {logger} from "../app";
import {HasIdentity, Nullable} from "../types";

export class EventEmitter {
    readonly notifyHandlers: Map<string, NotifySubscriberFunc[]>;
    constructor() {
        this.notifyHandlers = new Map<string, NotifySubscriberFunc[]>();
    }
    on(evt: string, subscriber: NotifySubscriberFunc): EventEmitter {
        if(!this.notifyHandlers.has(evt)) {
            this.notifyHandlers.set(evt, []);
        }
        this.notifyHandlers.get(evt)!!.push(subscriber);
        return this;
    }
    emit(evt: string, data: Nullable<any>) {
        if(this.notifyHandlers.has(evt)) {
            let subscribers = this.notifyHandlers.get(evt);
            if(subscribers != null) {
                subscribers.forEach(s => {
                    try {
                        s(data);
                    } catch(e) {
                        logger.err(`Error in notify subscriber: ${e}`);
                    }
                })
            }
        }
    }
}
export type NotifySubscriber = NotifySubscriberPresent & {
    evt: string;
};
export type NotifySubscriberPresent = {
    on: NotifySubscriberFunc;
}
export type NotifySubscriberFunc = (data: Nullable<any>) => void;