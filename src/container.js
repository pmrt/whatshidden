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
    LOGIN_CHECK_INTERVAL,
    QRCODE_SELECTOR,
    CODE_ATTRIBUTE,
    QRCODE_WAIT_TIMEOUT,
} from './consts';
import { MessageEvent } from './msg/events';
import { extract } from './msg/message';
import { MessageLogger } from './msg/logger';
import logger, { LOG_LEVEL } from './logger';
import { Session } from './session';
import { isProd, exit, clearConsole} from './utils';
import { staleDataDetected } from './errors';
import { version } from '../package.json';

// TODO - Don't download the same image in the same conversation twice.
// TODO - folders to conversations and images
// TODO - support for documents, videos, stickers..
export class WAContainer {
    constructor() {
        this._onWAMessage = this._onWAMessage.bind(this);
        this._onWAReady = this._onWAReady.bind(this);
        this._onWATimeout = this._onWATimeout.bind(this);

        this._sessionManager = new Session();
        this._msgLogger = new MessageLogger();
        this._tracker = new MessageEvent();
        this._tracker.on("wa:message", this._onWAMessage);
        this._tracker.on("wa:ready", this._onWAReady);
        this._tracker.on("wa:ready-timeout", this._onWATimeout);

        this._init();
    }

    log(msg) {
        this._msgLogger.log(msg);
    }

    // save user's session
    async save() {
        let sessionItems = await this._page.evaluate(() =>  getSession());
        await this._sessionManager.save(sessionItems);
    }

    // restore user's session
    async restore() {
        return await this._sessionManager.restore(this._page);
    }

    async _isLoggedIn() {
        return await this._page.evaluate(() => isLoggedIn());
    }

    async _setupLoadWatcher() {
        return await this._page.evaluate(() => waitForReady());
    }

    // _loginCheck will check the login status after `msToCheck` milliseconds. If a callback
    // `cb` is provided, it'll execute the callback after the time has elapsed, otherwise the
    // function turns into a recursive one with a pre-defined behaviour (it'll invoke staleDataDetected
    // if user is not logged in by that time).
    _loginCheck(msToCheck, cb) {
        setTimeout(async () => {
            logger.verbose('checking login state..');
            const isLoggedIn = await this._isLoggedIn();
            if (cb) {
                return cb(isLoggedIn);
            }

            if (!isLoggedIn) {
                staleDataDetected();
            }
            this._loginCheck(msToCheck);
        }, msToCheck);
    }

    _onWAMessage(evt) {
        let msg;

        try {
             msg = extract(evt);
            if (msg.isMedia()) {
                msg.downloadAndDecrypt();
            }
            this.log(msg);
        } catch(e) {
            logger.warn("onWAMessage: failed to read new message");
            logger.error(e)
            return;
        }

        logger.verbose(`-> ${msg.sender} [${msg.at}] ${msg.toString()}`);
    }

    _onWAReady() {
        logger.verbose("WhatsApp Web finished loading");
        this._startMiddleman();
    }

    async _onWATimeout() {
        logger.verbose("WhatsApp Web loading time limit exceeded");
        if (!await this._isLoggedIn()) {
            staleDataDetected();
        }
        exit(0);
    }

    async _addScript() {
        await this._page.addScriptTag({
             path: './src/hook/connect.js'
        });
    }

    async _reload() {
        await this._page.reload({
            waitUntil: 'domcontentloaded',
        });
        logger.verbose('page refreshed');
        await this._addScript();
    }

    async _launch() {
        this._browser = await puppeteer.launch({
            headless: isProd,
            devtools: !isProd,
        });
        logger.verbose("using %s", await this._browser.version());
        this._page = await this._browser.newPage();
        logger.verbose("changing user-agent to '%s'", USER_AGENT);

        logger.verbose("exposing emitters..");
        await this._page.exposeFunction("emit", (event, ...args) =>
            this._tracker.emit(event, ...args)
        );

        this._page.setUserAgent(USER_AGENT);
        await this._page.goto(WHATSAPP_WEB_URL);
        await this._addScript();

        if (await this.restore()) {
            await this._reload();
        }
    }

    async _getWAGlobals() {
        return await this._page.evaluate(() => getConstants());
    }

    async _hasQRCode() {
        return await this._page.$(QRCODE_SELECTOR) !== null;
    }

    async _getCode() {
        let code = await this._page.$eval(QRCODE_SELECTOR, (el, attr) => el.getAttribute(attr), CODE_ATTRIBUTE);
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

    async _waitForQRCode() {
        return await this._page.waitForSelector(QRCODE_SELECTOR, {
            timeout: QRCODE_WAIT_TIMEOUT,
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
                this.save();
                break;
            case QR_SCAN_STATE.TIMEOUT:
                logger.warn('QRCode scanning timeout.');
                exit(0, "No user has scanned the QR Code. Quiting.. ");
            case QR_SCAN_STATE.ERROR:
            default:
                logger.error('QRCode scanning error. Unknown QRCode element state.');
                exit(1);
        }
        return true;
    }

    async _startMiddleman() {
        logger.verbose("injecting function..");
        await this._page.evaluate(() => inject(emitMessage));
        logger.info("ready");
        logger.info("waiting for new messages, do not stop the process..");
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
            if (!await this._isLoggedIn()) {
                await this._waitForQRCode();
                code = await this._getCode();
                const WAGlobals = await this._getWAGlobals();
                this.GIVE_UP_WAIT = WAGlobals.GIVE_UP_WAIT;
                await this._startQR(code);
            }

            logger.info("waiting for WhatsApp Web to load..")
            this._setupLoadWatcher();
            this._loginCheck(LOGIN_CHECK_INTERVAL);

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