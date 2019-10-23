import logger from './logger';
import { mkdir, unlink } from 'fs';
import { FULL_DATA_PATH, SESSION_FILE, DATA_DIR } from './consts';
import { join } from 'path';

export const isProd = process.env.NODE_ENV === 'production';

export function exit(exitCode=0, warn) {
    if (warn) {
        logger.warn(warn);
    }
    process.exit(exitCode);
}

export function clearSession() {
    const filePath = join(FULL_DATA_PATH, SESSION_FILE);
    unlink(filePath, err => {
        if (err) {
            logger.error(`failed to delete ${filePath}. Please, remove it manually.`);
            logger.error(err)
            exit(1);
        }
    });
}

export function clearConsole() {
    process.stdout.write('\x1B[2J');
}

export function ensureExists(path, cb) {
    mkdir(path, err => {
        if (err) {
            if (err.code === 'EEXIST') {
                return cb();
            }
            return cb(err);
        }
        cb();
    });
}