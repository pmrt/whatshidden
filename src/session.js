import { writeFile, readFile } from "fs";
import { join } from "path";
import { FULL_DATA_PATH, SESSION_FILE } from "./consts";
import logger from "./logger";

const filePath = join(FULL_DATA_PATH, SESSION_FILE)

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
                    logger.error(`error while saving session to ${filePath}. ${err.message}`);
                    return;
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
                        let msg = "no session file found, skipping...";
                        logger.warn(msg);
                        return resolve(false);
                    }
                    logger.error(err);
                    return reject(err);
                }

                let session;
                try {
                    session = JSON.parse(raw);
                } catch(e) {
                    logger.error(`failed to restore sesion: bad session file ${filePath}`);
                    return reject(e);
                }

                if (!session.storage) {
                    let msg = `failed to restore sesion: bad session file ${filePath}`;
                    logger.error(msg);
                    return reject(msg);
                }
                logger.verbose('[+] got session, trying to restore it');

                try {
                    await toPage.evaluate((items) => setSession(items), session.storage);
                } catch(e) {
                    logger.error(`failed to restore session: error while evaluating DOM`);
                    reject(e);
                }

                logger.info('session loaded successfully');
                resolve(true);
            });
        });
    }
}