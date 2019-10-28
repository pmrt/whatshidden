import { FULL_DATA_PATH, FULL_CHAT_LOGS_PATH } from './consts.js';
import logger from './logger.js';
import { exit, ensureExists,  } from './utils.js';

import { WAContainer } from './container.js';

const dirError = err => {
    if (err) {
        logger.error(err);
        exit(1);
    }
}

ensureExists(FULL_DATA_PATH, dirError);
ensureExists(FULL_CHAT_LOGS_PATH, dirError);

process.on('SIGINT', sig =>
    exit(0, "SIGNINT RECEIVED (stopped by user interaction)")
);

new WAContainer();