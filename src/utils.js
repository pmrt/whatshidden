import logger from './logger.js';
import { unlink } from 'fs';
import { FULL_DATA_PATH, SESSION_FILE, FULL_CHAT_LOGS_PATH, MEDIA_DIR } from './consts.js';
import { join } from 'path';
import mkdirp  from 'mkdirp';
import { SessionCleanupFailedError, SenderPathCreationFailed } from './errors.js';

export const isDev = process.env.NODE_ENV === 'development';

export function exit(exitCode=0) {
    process.exit(exitCode);
}

export function clearSession() {
    const filePath = join(FULL_DATA_PATH, SESSION_FILE);
    unlink(filePath, err => {
        if (err) {
            return new SessionCleanupFailedError({
                message: `(filePath: ${filePath}) ${err.message}. Please remove it manually`
            });
        }
        logger.verbose("session file deleted");
    });
}

export function getSenderPath(sender) {
    const path = join(FULL_CHAT_LOGS_PATH, sender);
    ensureExists(join(path, MEDIA_DIR), err => {
        if (err) {
            return new SenderPathCreationFailed({
                message: err.message
            });
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