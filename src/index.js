import puppeteer from 'puppeteer';
import qrcode from 'qrcode-terminal';

import {
    USER_AGENT,
    WHATSAPP_WEB_URL,
    EXPIRATION_MARGIN,
    QR_OBSERVE_INTERVAL,
    QR_SCAN_STATE,
    LOGIN_STATE,
    LOGIN_OBSERVE_INTERVAL,
    LOGIN_OBSERVE_TIMEOUT,
} from './consts';
import { MessageEvent } from './msg/events';
import { extract } from './msg/message';
import { MessageLogger } from './msg/logger';
import logger, { LOG_LEVEL } from './logger';
import { isProd, exit, clearConsole } from './utils';
import { version } from '../package.json';

// TODO - Get all the incoming messages, download attachments if the message is an image/voice/video/document and store them.
//  - Get each message
//  - If it's an image, download it.
// TODO - Store & retrieve pass sessions so it doesn't have to scan the qrcode again.
//  - Backup local storage session after login.
//  - Restore session after launch if available.
// TODO - HTML Preview of the chats (v2)
// - use a db

class WAContainer {
    constructor() {
        this._msgLogger = new MessageLogger();
        this._tracker = new MessageEvent();
        this._tracker.on("message", this._onMessage);

        this._init();
    }

    log(msg) {
        this._msgLogger.log(msg);
    }

    async _isLoggedIn() {
        return await this._page.evaluate(() =>  isLoggedIn());
    }

    _onMessage(evt) {
        const msg = extract(evt);
        this.log(msg);
        logger.verbose(`-> ${msg.sender} [${msg.at}] ${msg.toString()}`);
    }

    async _launch() {
        this._browser = await puppeteer.launch({
            headless: isProd,
        });
        logger.verbose("using %s", await this._browser.version());
        this._page = await this._browser.newPage();
        logger.verbose("changing user-agent to '%s'", USER_AGENT);

        this._page.setUserAgent(USER_AGENT);
        await this._page.goto(WHATSAPP_WEB_URL);
        await this._page.addScriptTag({
             path: './src/hook/connect.js'
        });
    }

    async _getWAGlobals() {
        return await this._page.evaluate(() => getConstants());
    }

    async _hasQRCode() {
        return await this._page.$('[data-ref]') !== null;
    }

    async _getCode() {
        let code = await this._page.$eval('[data-ref]', el => el.getAttribute('data-ref'));
        if (!code) {
            throw new Error("session code couldn't be read");
        }
        return code;
    }

    _drawQR(code) {
        clearConsole();
        logger.info('Scan the following QRCode with your WhatsApp app: ')
        logger.verbose("got session code '%s'", code);
        qrcode.generate(code, {
            small: true,
        });
    }

    // waitForLogin checks if user is logged in until it is or time expires.
    //
    // As the login process takes time, you'll need to wait a while before checking if user is logged in right after
    // the login process has started.
    async _waitForLogin() {
        return new Promise(resolve => {
            let timeout, timer;
            timeout = setTimeout(() => {
                clearInterval(timer);
                resolve(LOGIN_STATE.TIMEOUT);
            }, LOGIN_OBSERVE_TIMEOUT);

            timer = setInterval(async () => {
                if (await this._isLoggedIn()) {
                    clearTimeout(timeout);
                    clearInterval(timer);
                    resolve(LOGIN_STATE.LOGGED_IN);
                }
            }, LOGIN_OBSERVE_INTERVAL);
        });
    }

    async _refreshQR(code) {
        return new Promise(resolve => {
            let timeout, timer, newCode;

            timeout = setTimeout(() => {
                clearInterval(timer);
                resolve(QR_SCAN_STATE.TIMEOUT);
            }, this.GIVE_UP_WAIT - EXPIRATION_MARGIN);

            timer = setInterval(async () => {
                if (!await this._hasQRCode()) {
                    clearTimeout(timeout);
                    clearInterval(timer);

                    switch(await this._waitForLogin()) {
                        case LOGIN_STATE.LOGGED_IN:
                            return resolve(QR_SCAN_STATE.SCANNED);
                        case LOGIN_STATE.TIMEOUT:
                        default:
                            return resolve(QR_SCAN_STATE.ERROR);
                    }
                }

                newCode = await this._getCode();
                if (newCode !== code) {
                    this._drawQR(code = newCode);
                }
            }, QR_OBSERVE_INTERVAL);
        });
    }

    async _startQR(code) {
        this._drawQR(code);

        let res;
        try {
            res = await this._refreshQR(code)
        } catch(e) {
            const msg = "QRCode scanning error: " + e.message;
            logger.error(msg);
            throw new Error(msg);
        }

        switch (res) {
            case QR_SCAN_STATE.SCANNED:
                clearConsole();
                logger.info('QRCode successfully scanned');
                return this._startMiddleman();
            case QR_SCAN_STATE.TIMEOUT:
                logger.warn('QRCode scanning timeout.');
                exit(0, "No user has scanned the QR Code. Quiting.. ");
            case QR_SCAN_STATE.ERROR:
            default:
                logger.error('QRCode scanning error. Unknown QRCode element state.');
                exit(1);
        }
    }

    async _startMiddleman() {
        logger.verbose("creating inject function..");
        await this._page.exposeFunction("emitMessage", (...args) =>
            this._tracker.emit('message', ...args)
        );

        logger.verbose("injecting function..");
        await this._page.evaluate(() => inject(emitMessage));
    }

    async _init() {
        logger.info(
            '[Whatslogged v%s]: new instance from %s; prod_mode=%s; log_level=%s',
            version,
            process.cwd(),
            isProd,
            LOG_LEVEL,
        );

        let code;
        try {
            await this._launch();
            code = await this._getCode();
            const WAGlobals = await this._getWAGlobals();
            this.GIVE_UP_WAIT = WAGlobals.GIVE_UP_WAIT;
            this._startQR(code);
        } catch(e) {
            if (this._browser) {
                // browser.close could throw unhandled promise errors - ignore them (we're just exiting)
                await this._browser.close();
            }
            logger.error(e);
            exit(1);
        }
    }
}

process.on('SIGINT', sig => exit(0, "SIGNINT RECEIVED (stopped by user interaction)"));

new WAContainer();