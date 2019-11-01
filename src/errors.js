import logger from './logger.js';
import { clearSession, exit } from './utils.js';

export const PAGE_WONT_LOAD = "WhatsApp Web won't load. Your credentials may have expired or you have closed your session from your mobile phone. In an attempt to recover from this state, the application will delete your session data file"
export const TOO_MANY_ATTEMPTS_TO_RECOVER_SESSION = "Too many attempts to recover session. You may be using WhatsApp Web on another device too much, WhatsApp Web only allows 1 session at a time";

export function recover(msg) {
    logger.error(msg);
    logger.info("Exiting..");
    clearSession();
    exit(0);
}