import puppeteer from 'puppeteer';

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
import logger, { LOG_LEVEL } from './logger';
import { isProd, exit } from './utils';
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
        this.init();
    }

    async launch() {
        this.browser = await puppeteer.launch({
            headless: isProd,
        });
        logger.verbose("using %s", await this.browser.version());
        this.page = await this.browser.newPage();
        logger.verbose("changing user-agent to '%s'", USER_AGENT);

        this.page.setUserAgent(USER_AGENT);
        await this.page.goto(WHATSAPP_WEB_URL);
        await this.page.addScriptTag({
             path: './src/hook/connect.js'
        });
    }

    async isLoggedIn() {
        return await this.page.evaluate(() =>  isLoggedIn());
    }

    async getWAGlobals() {
        return await this.page.evaluate(() => getConstants());
    }

    async hasQRCode() {
        return await this.page.$('[data-ref]') !== null;
    }

    async getCode() {
        let code = await this.page.$eval('[data-ref]', el => el.getAttribute('data-ref'));
        if (!code) {
            throw new Error("session code couldn't be read");
        }
        return code;
    }

    drawQR(code) {
        logger.verbose("got session code '%s'", code);
    }

    // waitForLogin checks if user is logged in until it is or time expires.
    //
    // As the login process takes time, you'll need to wait a while before checking if user is logged in right after
    // the login process has started.
    async waitForLogin() {
        return new Promise(resolve => {
            let timeout, timer;
            timeout = setTimeout(() => {
                clearInterval(timer);
                resolve(LOGIN_STATE.TIMEOUT);
            }, LOGIN_OBSERVE_TIMEOUT);

            timer = setInterval(async () => {
                if (await this.isLoggedIn()) {
                    clearTimeout(timeout);
                    clearInterval(timer);
                    resolve(LOGIN_STATE.LOGGED_IN);
                }
            }, LOGIN_OBSERVE_INTERVAL);
        });
    }

    async refreshQR(code) {
        return new Promise(resolve => {
            let timeout, timer, newCode;

            timeout = setTimeout(() => {
                clearInterval(timer);
                resolve(QR_SCAN_STATE.TIMEOUT);
            }, this.GIVE_UP_WAIT - EXPIRATION_MARGIN);

            timer = setInterval(async () => {
                if (!await this.hasQRCode()) {
                    clearTimeout(timeout);
                    clearInterval(timer);

                    switch(await this.waitForLogin()) {
                        case LOGIN_STATE.LOGGED_IN:
                            return resolve(QR_SCAN_STATE.SCANNED);
                        case LOGIN_STATE.TIMEOUT:
                        default:
                            return resolve(QR_SCAN_STATE.ERROR);
                    }
                }

                newCode = await this.getCode();
                if (newCode !== code) {
                    this.drawQR(code = newCode);
                }
            }, QR_OBSERVE_INTERVAL);
        });
    }

    async startQR(code) {
        this.drawQR(code);

        let res;
        try {
            res = await this.refreshQR(code)
        } catch(e) {
            const msg = "QRCode scanning error: " + e.message;
            logger.error(msg);
            throw new Error(msg);
        }

        switch (res) {
            case QR_SCAN_STATE.SCANNED:
                logger.info('QRCode successfully scanned');
                return this.startMiddleman();
            case QR_SCAN_STATE.TIMEOUT:
                logger.warn('QRCode scanning timeout.');
                exit(0, "No user has scanned the QR Code. Quiting.. ");
            case QR_SCAN_STATE.ERROR:
            default:
                logger.error('QRCode scanning error. Unknown QRCode element state.');
                exit(1);
        }
    }

    startMiddleman() {
        logger.verbose("Executing injected hooks..");
    }

    async init() {
        logger.info(
            '[Whatslogged v%s]: new instance from %s; prod_mode=%s; log_level=%s',
            version,
            process.cwd(),
            isProd,
            LOG_LEVEL,
        );

        let code;
        try {
            await this.launch();
            code = await this.getCode();
            const WAGlobals = await this.getWAGlobals();
            this.GIVE_UP_WAIT = WAGlobals.GIVE_UP_WAIT;
            this.startQR(code);
        } catch(e) {
            if (this.browser) {
                // browser.close could throw unhandled promise errors - ignore them (we're just exiting)
                await this.browser.close();
            }
            logger.error(e);
            exit(1);
        }
    }
}

process.on('SIGINT', (sig) => exit(0, "SIGNINT RECEIVED (stopped by user interaction)"));

new WAContainer();