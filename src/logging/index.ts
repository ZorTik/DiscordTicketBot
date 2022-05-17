interface Logger<L extends LevelDef = LevelDef> {
    log(message: string, level: L): any;
}
class LevelDef {
    identifier: string;
    constructor(identifier: string) {
        this.identifier = identifier;
    }
}
export class Level {
    static INFO = new LevelDef("INFO");
    static WARN = new LevelDef("WARNING");
    static ERR = new LevelDef("ERROR");
}
abstract class DefaultLogger implements Logger {
    info(message: string) {
        this.log(message, Level.INFO);
    }
    warn(message: string) {
        this.log(message, Level.WARN);
    }
    err(message: string) {
        this.log(message, Level.ERR);
    }
    abstract log(message: string, level: LevelDef): any;
}
export class DateTimeLogger extends DefaultLogger {
    log(message: string, level: LevelDef) {
        const date = new Date();
        console.log("[" + function() {
            return (date.getUTCDay() + 1)
                + ". " + (date.getUTCMonth() + 1)
                + ". " + date.getUTCFullYear()
                + " " + date.getUTCHours()
                + " " + date.getUTCMinutes();
        } + "]")
    }
}