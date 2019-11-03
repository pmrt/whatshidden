import winston from 'winston';
import { CHAT_LOGS_EXTENSION, CHAT_FILENAME } from '../consts.js';
import { join } from 'path';
import { getSenderPath } from '../utils.js';

const loggerOts = {
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.printf(info => `${info.message}`),
    ),
    maxSize: '1mb',
}

class Conversations {
    constructor() {
        this.container = new winston.Container();
    }

    add(id, sender) {
        const opts = {...loggerOts, ...{
                transports: [
                    new winston.transports.File({
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
        this._chats = new Conversations();
    }

    // log a message with a provided `msg` <Message> instance (see message.js)
    log(msg) {
        const id = msg.sender;
        let logger = this._chats.has(id)
            ? this._chats.get(id)
            // we'll use sender as id for now
            : this._chats.add(id, id);
        logger.info(`[${msg.at}] ${msg.toLog()}`)
    }
}