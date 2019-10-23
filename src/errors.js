import logger from './logger';
import { clearSession, exit } from './utils';

export function staleDataDetected() {
    logger.error("Old session data detected. Your credentials may have expired or you have closed your session from your mobile phone. To recover from this state, the application will delete your session data file");
    logger.info("Exiting..");
    clearSession();
    exit(0);
}