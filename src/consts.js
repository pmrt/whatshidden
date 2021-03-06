import { join } from "path";

// fixed url for whatsapp web
export const WHATSAPP_WEB_URL = 'https://web.whatsapp.com';
// dom selector for finding the qrcode
export const QRCODE_SELECTOR = '[data-ref]';
// time limit to wait for QRCode element
export const QRCODE_WAIT_TIMEOUT = 30e3;
// dom attribute name which stores the QRCode content
export const CODE_ATTRIBUTE = 'data-ref';
// log directory name
export const LOG_DIR_NAME = 'logs';
// user-agent string to use
export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36';
// QR rotation process timeout (milliseconds)
export const QR_ROTATION_TIMEOUT = 120e3
// expiration time margin (milliseconds)
export const EXPIRATION_MARGIN = 5e3;
// time to observe the qr code scanning state again (milliseconds)
export const QR_OBSERVE_INTERVAL = 50;
// time to observe the login state again (milliseconds)
export const LOGIN_OBSERVE_INTERVAL = 100;
// time to timeout login state observation (milliseconds)
export const LOGIN_OBSERVE_TIMEOUT = 45e3;
// directory name of chat logs
export const CHAT_LOGS_DIR = 'chats';
// directory name of decrypted media
export const MEDIA_DIR = 'attachments';
// path to chat logs
export const FULL_CHAT_LOGS_PATH = join(process.cwd(), CHAT_LOGS_DIR);
// chat log filename
export const CHAT_FILENAME = 'chat';
// chat logs file extension
export const CHAT_LOGS_EXTENSION = 'log';
// data directory name
export const DATA_DIR = '.data';
// path to app data
export const FULL_DATA_PATH = join(process.cwd(), DATA_DIR);
// session file (with extension)
export const SESSION_FILE = 'session.json';
// interval after which the app will check the status again (milliseconds)
export const CHECK_INTERVAL = 900e3;
// times before fail if a refresh is needed (for reference: 100 attempts every 15 min (ie. CHECK_INTERVAL) = about 25h passed since the app
// didn't log any message consistently)
export const NEED_REFRESH_COUNTER_BEFORE_FAIL = 100;
// filename of the last check screenshot
export const CHECK_LAST_SCREENSHOT_FILENAME = 'last_check';
// expand key length (bytes)
export const HKDF_EXPAND_LENGTH = 112;

export const QR_SCAN_STATUS = {
    SCANNED: 1,
    TIMEOUT: 2,
    ERROR: 3,
}

export const LOGIN_STATUS = {
    LOGGED_IN: 1,
    TIMEOUT: 2,
    ERROR: 3,
}