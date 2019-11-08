import logger from './logger.js';
import { clearSession, exit } from './utils.js';
import program from 'commander';

const UNKNOWN_MESSAGE = "An unknown error has occurred";
// File
const SENDER_PATH_CREATION_FAILED = "failed to create sender path";
// Whatsapp
const WHATSAPP_WEB_TIMEOUT = "WhatsApp Web loading time limit exceeded";
// Session
const CREDENTIALS_MAY_HAVE_EXPIRED = "WhatsApp Web won't load. Your credentials may have expired or you have closed your session from your mobile phone. In an attempt to recover from this state, the application will delete your session data file"
const TOO_MANY_ATTEMPTS_TO_RECOVER_SESSION = "Too many attempts to recover session: session unrecoverable. You may be using WhatsApp Web on another device too much (WhatsApp Web only allows 1 session at a time) or an unrecoverable error has occurred";
const REFRESH_SCHEDULED = "-> refresh scheduled for the next check, no message will be logged in the meantime";
const SESSION_CLEANUP_FAILED = "failed to delete the session";
const SESSION_SAVE_FAILED = "failed to save session";
const SESSION_RESTORE_FAILED = "failed to restore session";
const SESSION_NO_FOUND = "no session file found. Saving skipped";
// Messages
const CANT_RECEIVE_MESSAGES = "Can't receive messages, you may have logged in on another device (WhatsApp Web only allows 1 session at a time)";
const NEW_MESSAGE_READING_FAILED = "Failed to read new message";
const MEDIA_DECRYPTION_FAILED = "Error while decrypting media";
const MEDIA_DOWNLOAD_FAILED = "Error while downloading media";
// QRCode
const QRCODE_SCANNING_FAILED = "Scanning error";
const QRCODE_UNKNOWN_ELEMENT_STATE = "Unknown QRCode element state";
const QRCODE_SCANNING_TIMEOUT = "QRCode scanning time limit exceeded. No user has scanned the QRCode";


class TopWhatshiddenError extends Error {
    constructor(msg) {
        super(msg);

        /*
            Take screenshot if -s/--screenshot is provided and the error has takeScreenshot = true.

            As general rule, disable takeScreenshot only if the error has nothing to do with
            whatsapp web's page (ie. creating a new folder, saving to a file...)
        */
        if (program.screenshot && this.takeScreenshot) {
            await this._page.screenshot({
              path: `logs/${this.name}.png`
            });
        }
    }

    get name() {
        return "WhatshiddenError"
    }

    get takeScreenshot() {
        return true;
    }
}

class WhatshiddenWarn extends TopWhatshiddenError {
    constructor(msg) {
        super(msg)
        this.log(msg);
    }

    log(msg) {
        logger.warn(msg);
    }

    get name() {
        return "WhatshiddenWarn";
    }
}

class WhatshiddenError extends Error {
    constructor(msg) {
        super(msg);
        this.log(msg);
    }

    log(msg) {
        logger.error(msg);
    }

    get name() {
        return "WhatshiddenError";
    }
}

class WhatshiddenCriticalError extends WhatshiddenError {
    constructor(msg) {
        super(msg);

        if (this.doRecover) {
            this.recover();
        }

        this.quit();
    }

    recover() {
        clearSession();
    }

    quit() {
        logger.info("Exiting..");
        // Exit without error to avoid npm to generate useless stacktrace
        exit(0);
    }

    get doRecover() {
        return false;
    }

    get name() {
        return "WhatshiddenCriticalError";
    }
}

export class UnknownError extends WhatshiddenError {
    constructor(msg = UNKNOWN_MESSAGE) {
        super(msg);
    }

    get name() {
        return "UnknownError";
    }
}

export class UnknownCriticalError extends WhatshiddenCriticalError {
    constructor(msg = UNKNOWN_MESSAGE) {
        super(msg);
    }

    get name() {
        return "UnknownCriticalError";
    }
}

/*
    File
*/
export class SenderPathCreationFailed extends WhatshiddenCriticalError {
    constructor(msg) {
        super(msg ? `${SENDER_PATH_CREATION_FAILED}: ${msg}` : SENDER_PATH_CREATION_FAILED);
    }

    get name() {
        return "SenderPathCreationFailed";
    }

    get takeScreenshot() {
        return false;
    }
}

/*
    WhatsApp
*/

export class WhatsAppWebTimeoutError extends WhatshiddenCriticalError {
    constructor(msg = WHATSAPP_WEB_TIMEOUT) {
        super(msg);
    }

    get name() {
        return "WhatsAppWebTimeoutError";
    }
}

/*
    QRCode
*/

export class QRCodeScanningError extends WhatshiddenCriticalError {
    constructor(msg) {
        super(msg ? `${QRCODE_SCANNING_FAILED}: ${msg}` : QRCODE_SCANNING_FAILED);
    }

    get name() {
        return "QRCodeScanningError";
    }
}

export class QRCodeScanningTimeoutError extends WhatshiddenCriticalError {
    constructor(msg = QRCODE_SCANNING_TIMEOUT) {
        super(msg);
    }

    get name() {
        return "QRCodeScanningTimeoutError";
    }
}

export class UnknownQRCodeElementState extends WhatshiddenCriticalError {
    constructor(msg) {
        super(`${QRCODE_SCANNING_FAILED}: ${QRCODE_UNKNOWN_ELEMENT_STATE}`);
    }

    get name() {
        return "UnknownQRCodeElementState";
    }
}

/*
    Messages
*/

export class CantReceiveMessagesWarn extends WhatshiddenWarn {
    constructor(msg = CANT_RECEIVE_MESSAGES) {
        super(msg);
    }

    get name() {
        return "CantReceiveMessagesWarn";
    }
}

export class NewMessageReadingFailedWarn extends WhatshiddenWarn {
    constructor(msg = NEW_MESSAGE_READING_FAILED) {
        super(msg);
    }

    get name() {
        return "NewMessageReadingFailedWarn";
    }
}

export class MediaDecryptionFailedWarn extends WhatshiddenWarn {
    constructor(msg) {
        super(msg ? `${MEDIA_DECRYPTION_FAILED}: ${msg}` : MEDIA_DECRYPTION_FAILED)
    }

    get name() {
        return "MediaDecryptionFailedWarn";
    }
}

export class MediaDownloadFailedWarn extends WhatshiddenWarn {
    constructor(msg) {
        super(msg ? `${MEDIA_DOWNLOAD_FAILED}: ${msg}` : MEDIA_DOWNLOAD_FAILED)
    }

    get name() {
        return "MediaDownloadFailedWarn";
    }
}

/*
    Session
*/

export class CredentialsMayHaveExpiredError extends WhatshiddenCriticalError {
    constructor(msg = CREDENTIALS_MAY_HAVE_EXPIRED) {
        super(msg);
    }

    get doRecover() {
        return true;
    }

    get name() {
        return "CredentialsMayHaveExpiredError";
    }
}

export class RefreshScheduledWarn extends WhatshiddenWarn {
    constructor(msg = REFRESH_SCHEDULED) {
        super(msg);
    }

    get name() {
        return "RefreshScheduledWarn";
    }
}

export class CantRecoverSessionError extends WhatshiddenCriticalError {
    constructor(msg = TOO_MANY_ATTEMPTS_TO_RECOVER_SESSION) {
        super(msg);
    }

    get doRecover() {
        return true;
    }

    get name() {
        return "CantRecoverSessionError";
    }
}

export class SessionCleanupFailedError extends WhatshiddenCriticalError {
    constructor(msg) {
        super(msg ? `${SESSION_CLEANUP_FAILED}: ${msg}` : SESSION_CLEANUP_FAILED);
    }

    get name() {
        return "SessionCleanupFailedError";
    }

    get takeScreenshot() {
        return false;
    }
}

export class SessionSaveFailedWarn extends WhatshiddenWarn {
    constructor(msg) {
        super(msg ? `${SESSION_SAVE_FAILED}: ${msg}` : SESSION_SAVE_FAILED);
    }

    get name() {
        return "SessionSaveFailedWarn";
    }

    get takeScreenshot() {
        return false;
    }
}

export class SessionRestoreFailedWarn extends WhatshiddenWarn {
    constructor(msg) {
        super(msg ? `${SESSION_RESTORE_FAILED}: ${msg}` : SESSION_RESTORE_FAILED);
    }

    get name() {
        return "SessionRestoreFailedError";
    }

    get takeScreenshot() {
        return false;
    }
}

export class SesssionNoFoundWarn extends WhatshiddenWarn {
    constructor(msg = SESSION_NO_FOUND) {
        super(msg);
    }

    get name() {
        return "SesssionNoFoundWarn";
    }

    get takeScreenshot() {
        return false;
    }
}