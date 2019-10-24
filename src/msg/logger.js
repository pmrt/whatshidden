import { Container, format, transports } from 'winston';
import { CHAT_LOGS_EXTENSION, CHAT_FILENAME } from '../consts';
import { join } from 'path';
import { getSenderPath } from '../utils';

const loggerOts = {
    format: format.combine(
        format.splat(),
        format.printf(info => `${info.message}`),
    ),
    maxSize: '1mb',
}

class Conversations {
    constructor() {
        this.container = new Container();
    }

    add(id, sender) {
        const opts = {...loggerOts, ...{
                transports: [
                    new transports.File({
                        filename: join(getSenderPath(sender), `${CHAT_FILENAME}.${CHAT_LOGS_EXTENSION}`),
                    })
                ]
            }
         }
        return this.container.add(id, opts);
    }

    get(id) {
        return this.container.get(id);
    }

    has(id) {
        return this.container.has(id);
    }
}

export class MessageLogger {
    constructor() {
        const container = new Container();
        this._chats = new Conversations(container);
    }

    // log a message with a provided `msg` <Message> instance (see message.js)
    log(msg) {
        const id = msg.sender;
        let logger = this._chats.has(id)
            ? this._chats.get(id)
            : this._chats.add(id, `+${id}`);
        logger.info(`[${msg.at}] ${msg.toString()}`)
    }
}