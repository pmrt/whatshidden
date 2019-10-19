// fixed url for whatsapp web
export const WHATSAPP_WEB_URL = 'https://web.whatsapp.com';
// log directory name
export const LOG_DIR_NAME = 'logs';
// user-agent string to use
export const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36';
// expiration time margin (milliseconds)
export const EXPIRATION_MARGIN = 5e3;
// time to observe the qr code scanning state again (milliseconds)
export const QR_OBSERVE_INTERVAL = 250;
// time to observe the login state again (milliseconds)
export const LOGIN_OBSERVE_INTERVAL = 100;
// time to timeout login state observation (milliseconds)
export const LOGIN_OBSERVE_TIMEOUT = 1e3;

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