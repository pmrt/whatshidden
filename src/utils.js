import logger from './logger';
import { unlink } from 'fs';
import { FULL_DATA_PATH, SESSION_FILE, FULL_CHAT_LOGS_PATH } from './consts';
import { join } from 'path';
import mkdirp  from 'mkdirp';

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

export function getSenderPath(sender) {
    const path = join(FULL_CHAT_LOGS_PATH, sender);
    ensureExists(path, err => {
        if (err) {
            logger.warn(err);
            return;
        }
    });
    return path;
}

export function clearConsole() {
    process.stdout.write('\x1B[2J');
}

export function ensureExists(path, cb) {
    mkdirp(path, { recursive: true }, err => {
        if (err) {
            if (err.code === 'EEXIST' || err.code === 'ENOENT') {
                return cb();
            }
            return cb(err);
        }
        cb();
    });
}