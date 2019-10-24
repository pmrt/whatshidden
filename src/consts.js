import { join } from "path";

// fixed url for whatsapp web
export const WHATSAPP_WEB_URL = 'https://web.whatsapp.com';
// dom selector for finding the qrcode
export const QRCODE_SELECTOR = '[data-ref]';
// dom attribute name which stores the QRCode content
export const CODE_ATTRIBUTE = 'data-ref';
// log directory name
export const LOG_DIR_NAME = 'logs';
// user-agent string to use
export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36';
// expiration time margin (milliseconds)
export const EXPIRATION_MARGIN = 5e3;
// time to observe the qr code scanning state again (milliseconds)
export const QR_OBSERVE_INTERVAL = 50;
// time to observe the login state again (milliseconds)
export const LOGIN_OBSERVE_INTERVAL = 100;
// time to timeout login state observation (milliseconds)
export const LOGIN_OBSERVE_TIMEOUT = 1e3;
// directory name of chat logs
export const CHAT_LOGS_DIR = 'chats';
// path to chat logs
export const FULL_CHAT_LOGS_PATH = join(process.cwd(), CHAT_LOGS_DIR);
// chat logs file extension
export const CHAT_LOGS_EXTENSION = 'log';
// data directory name
export const DATA_DIR = '.data';
// path to app data
export const FULL_DATA_PATH = join(process.cwd(), DATA_DIR);
// session file (with extension)
export const SESSION_FILE = 'session.json';
// number of scripts needed to report that whatsapp web has loaded
export const SCRIPTS_NEEDED_TO_REPORT_LOAD = 10;
// interval after which the app will check again the login status to prevent stale
// session data. (milliseconds)
export const LOGIN_CHECK_INTERVAL = 900e3;
// expand key length (bytes)
export const HKDF_EXPAND_LENGTH = 112;

export const QR_SCAN_STATE = {
    SCANNED: 1,
    TIMEOUT: 2,
    ERROR: 3,
}

export const LOGIN_STATE = {
    LOGGED_IN: 1,
    TIMEOUT: 2,
    ERROR: 3,
}