import logger from './logger.js';
import { clearSession, exit } from './utils.js';
import program from 'commander';

const UNKNOWN_MESSAGE = "An unknown error has occurred";
// Whatshidden
const SENDER_PATH_CREATION_FAILED = "failed to create sender path";
// Whatsapp
const WHATSAPP_WEB_TIMEOUT = "WhatsApp Web loading time limit exceeded";
const WHATSAPP_WEB_LAUNCH_FAILED = "failed to load whatsapp web";
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
    constructor(errData = {}) {
        const { page, message } = errData;
        super(message);
        this._page = page;

        this.screenshot();
    }

    /*
        Take screenshot if -s/--screenshot is provided and the error has takeScreenshot = true.

        As general rule, disable takeScreenshot only if the error has nothing to do with
        whatsapp web's page (eg. creating a new folder, saving to a file...)
    */
    async screenshot() {
        console.log(this.hasPage(), program.screenshot, this.takeScreenshot)
        if (this.hasPage() && program.screenshot && this.takeScreenshot) {
            console.log(this._page);
            await this._page.screenshot({
              path: `logs/${this.name}.png`
            });
        }
    }

    hasPage() {
        return !!this._page;
    }

    get name() {
        return "WhatshiddenError"
    }

    get takeScreenshot() {
        return true;
    }
}

class WhatshiddenWarn extends TopWhatshiddenError {
    constructor(errData = {}) {
        super(errData)
        this.log(errData.message);
    }

    log(msg) {
        logger.warn(msg);
    }

    get name() {
        return "WhatshiddenWarn";
    }
}

class WhatshiddenError extends TopWhatshiddenError {
    constructor(errData = {}) {
        super(errData);
        this.log(errData.message);
    }

    log(msg) {
        logger.error(msg);
    }

    get name() {
        return "WhatshiddenError";
    }
}

class WhatshiddenCriticalError extends WhatshiddenError {
    constructor(errData = {}) {
        super(errData);

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
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || UNKNOWN_MESSAGE,
        });
    }

    get name() {
        return "UnknownError";
    }
}

export class UnknownCriticalError extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || UNKNOWN_MESSAGE,
        });
    }

    get name() {
        return "UnknownCriticalError";
    }
}

/*
    Whatshidden
*/
export class SenderPathCreationFailed extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message ? `${SENDER_PATH_CREATION_FAILED}: ${message}` : SENDER_PATH_CREATION_FAILED,
        });
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

export class WhatsAppWebLaunchError extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message ? `${WHATSAPP_WEB_LAUNCH_FAILED}: ${message}` : WHATSAPP_WEB_LAUNCH_FAILED,
        });
    }

    get name() {
        return "WhatsAppWebLaunchError";
    }
}

export class WhatsAppWebTimeoutError extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || WHATSAPP_WEB_TIMEOUT,
        });
    }

    get name() {
        return "WhatsAppWebTimeoutError";
    }
}

/*
    QRCode
*/

export class QRCodeScanningError extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message ? `${QRCODE_SCANNING_FAILED}: ${message}` : QRCODE_SCANNING_FAILED,
        });
    }

    get name() {
        return "QRCodeScanningError";
    }
}

export class QRCodeScanningTimeoutError extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || QRCODE_SCANNING_TIMEOUT,
        });
    }

    get name() {
        return "QRCodeScanningTimeoutError";
    }
}

export class UnknownQRCodeElementState extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: `${QRCODE_SCANNING_FAILED}: ${QRCODE_UNKNOWN_ELEMENT_STATE}`,
        });
    }

    get name() {
        return "UnknownQRCodeElementState";
    }
}

/*
    Messages
*/

export class CantReceiveMessagesWarn extends WhatshiddenWarn {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || CANT_RECEIVE_MESSAGES,
        });
    }

    get name() {
        return "CantReceiveMessagesWarn";
    }
}

export class NewMessageReadingFailedWarn extends WhatshiddenWarn {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || NEW_MESSAGE_READING_FAILED,
        });
    }

    get name() {
        return "NewMessageReadingFailedWarn";
    }
}

export class MediaDecryptionFailedWarn extends WhatshiddenWarn {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message ? `${MEDIA_DECRYPTION_FAILED}: ${message}` : MEDIA_DECRYPTION_FAILED,
        });
    }

    get name() {
        return "MediaDecryptionFailedWarn";
    }

    takeScreenshot() {
        return false;
    }
}

export class MediaDownloadFailedWarn extends WhatshiddenWarn {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message ? `${MEDIA_DOWNLOAD_FAILED}: ${message}` : MEDIA_DOWNLOAD_FAILED,
        });
    }

    get name() {
        return "MediaDownloadFailedWarn";
    }

    takeScreenshot() {
        return false;
    }
}

/*
    Session
*/

export class CredentialsMayHaveExpiredError extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || CREDENTIALS_MAY_HAVE_EXPIRED,
        });
    }

    get doRecover() {
        return true;
    }

    get name() {
        return "CredentialsMayHaveExpiredError";
    }
}

export class RefreshScheduledWarn extends WhatshiddenWarn {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || REFRESH_SCHEDULED,
        });
    }

    get name() {
        return "RefreshScheduledWarn";
    }
}

export class CantRecoverSessionError extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || TOO_MANY_ATTEMPTS_TO_RECOVER_SESSION,
        });
    }

    get doRecover() {
        return true;
    }

    get name() {
        return "CantRecoverSessionError";
    }
}

export class SessionCleanupFailedError extends WhatshiddenCriticalError {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message ? `${SESSION_CLEANUP_FAILED}: ${message}` : SESSION_CLEANUP_FAILED,
        });
    }

    get name() {
        return "SessionCleanupFailedError";
    }

    get takeScreenshot() {
        return false;
    }
}

export class SessionSaveFailedWarn extends WhatshiddenWarn {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message ? `${SESSION_SAVE_FAILED}: ${message}` : SESSION_SAVE_FAILED,
        });
    }

    get name() {
        return "SessionSaveFailedWarn";
    }

    get takeScreenshot() {
        return false;
    }
}

export class SessionRestoreFailedWarn extends WhatshiddenWarn {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message ? `${SESSION_RESTORE_FAILED}: ${message}` : SESSION_RESTORE_FAILED,
        });
    }

    get name() {
        return "SessionRestoreFailedError";
    }

    get takeScreenshot() {
        return false;
    }
}

export class SesssionNoFoundWarn extends WhatshiddenWarn {
    constructor(errData = {}) {
        const { page, message } = errData;
        super({
            page,
            message: message || SESSION_NO_FOUND,
        });
    }

    get name() {
        return "SesssionNoFoundWarn";
    }

    get takeScreenshot() {
        return false;
    }
}