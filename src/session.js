import { writeFile, readFile } from "fs";
import { join } from "path";
import { FULL_DATA_PATH, SESSION_FILE } from "./consts.js";
import logger from "./logger.js";
import { SessionSaveFailedWarn, SessionNotFoundWarn, UnknownError, SessionRestoreFailedWarn } from "./errors.js";

const filePath = join(FULL_DATA_PATH, SESSION_FILE);

export class Session {
    save(items) {
        const session = {
            storage: items
        };
        const str = JSON.stringify(session);

        logger.verbose('attempting to save the session');
        writeFile(
            filePath,
            str,
            {
                flag: 'w',
            },
            (err) => {
                if (err) {
                    return new SessionSaveFailedWarn({
                        message:`(filePath: ${filePath}) ${err.message}`
                    });
                }
                logger.verbose(`session saved to ${filePath}`);
            }
        )
    }

    async restore(toPage) {
        logger.verbose(`attempting to restore session..`);
        return new Promise((resolve, reject) => {
            readFile(filePath, 'utf8', async (err, raw) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        new SessionNotFoundWarn();
                        return resolve(false);
                    }
                    new UnknownError({
                        message: `Error when trying to read session file path ${filePath}: ${err.message}`
                    });
                    return reject(err);
                }

                let session;
                try {
                    session = JSON.parse(raw);
                } catch(err) {
                    new SessionRestoreFailedWarn({
                        message: `bad session file ${filePath}`
                    });
                    return reject(err);
                }

                if (!session.storage) {
                    err = new SessionRestoreFailedWarn({
                        message: `unrecognizable JSON in session file ${filePath}`
                    });
                    return reject(err);
                }
                logger.verbose('[+] got session, trying to restore it');

                try {
                    await toPage.evaluate((items) => setSession(items), session.storage);
                } catch(err) {
                    new SessionRestoreFailedWarn({
                        message: `error while evaluating DOM. ${err.message}`
                    });
                    reject(err);
                }

                logger.info('session injected successfully');
                resolve(true);
            });
        });
    }
}