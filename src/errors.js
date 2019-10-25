import logger from './logger';
import { clearSession, exit } from './utils';

export function recover() {
    logger.error(
        `WhatsApp Web won't load.

        Your credentials may have expired or you have closed your session from your
        mobile phone. In an attempt to recover from this state, the application
        will delete your session data file`
    );
    logger.info("Exiting..");
    clearSession();
    exit(0);
}