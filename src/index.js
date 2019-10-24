import { FULL_DATA_PATH } from './consts';
import logger from './logger';
import { exit, ensureExists,  } from './utils';

import { WAContainer } from './container';

ensureExists(FULL_DATA_PATH, err => {
    if (err) {
        logger.error(err);
        exit(1);
    }
});

process.on('SIGINT', sig =>
    exit(0, "SIGNINT RECEIVED (stopped by user interaction)")
);

new WAContainer();