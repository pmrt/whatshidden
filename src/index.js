import program from 'commander';

import packageConfig from '../package.json';
import { FULL_DATA_PATH, FULL_CHAT_LOGS_PATH } from './consts.js';
import { exit, ensureExists,  } from './utils.js';

import { WAContainer } from './container.js';
import { UnknownCriticalError } from './errors.js';

const dirError = err => {
    if (err) {
        new UnknownCriticalError({
            message: err.message
        });
    }
}

ensureExists(FULL_DATA_PATH, dirError);
ensureExists(FULL_CHAT_LOGS_PATH, dirError);

process.on('SIGINT', sig =>
    exit(0, "SIGNINT RECEIVED (stopped by user interaction)")
);

program
    .version(packageConfig.version)
    .option('-b, --browser <path>', 'Use a different chromium browser with the provided executable path')
    .option('-s, --screenshot', 'Take a screenshot on each check')
    .option('-d, --dumpio', 'Show chromium logs');

program.parse(process.argv);

new WAContainer();