import program from 'commander';

import packageConfig from '../package.json';
import { FULL_DATA_PATH, FULL_CHAT_LOGS_PATH } from './consts.js';
import { exit, ensureExists,  } from './utils.js';

import { WAContainer } from './container.js';
import { UnknownCriticalError } from './errors.js';
import logger from './logger.js';

const dirError = err => {
    if (err) {
        new UnknownCriticalError({
            message: err.message
        });
    }
}

ensureExists(FULL_DATA_PATH, dirError);
ensureExists(FULL_CHAT_LOGS_PATH, dirError);

program
    .version(packageConfig.version)
    .option('-b, --browser <path>', 'Use a different chromium browser with the provided executable path')
    .option('-s, --screenshot', "Take a screenshot of whatsapp web's page on each check and on errors related with the page. Screenshots are stored in your `logs` directory. Useful for debugging in headless mode.")
    .option('-d, --dumpio', 'Show chromium logs');

program.parse(process.argv);

const app = new WAContainer();

process.on('SIGINT', sig =>
    exit(0, "SIGNINT RECEIVED (stopped by user interaction)")
);