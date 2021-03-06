import puppeteer from 'puppeteer';
import qrcode from 'qrcode-terminal';
import md5 from 'md5';
import program from 'commander';

import {
    USER_AGENT,
    WHATSAPP_WEB_URL,
    EXPIRATION_MARGIN,
    QR_OBSERVE_INTERVAL,
    QR_SCAN_STATUS,
    LOGIN_STATUS,
    LOGIN_OBSERVE_INTERVAL,
    LOGIN_OBSERVE_TIMEOUT,
    CHECK_INTERVAL,
    QRCODE_SELECTOR,
    CODE_ATTRIBUTE,
    QRCODE_WAIT_TIMEOUT,
    QR_ROTATION_TIMEOUT,
    NEED_REFRESH_COUNTER_BEFORE_FAIL,
    CHECK_LAST_SCREENSHOT_FILENAME,
} from './consts.js';
import { MessageEvent } from './msg/events.js';
import { extract } from './msg/message.js';
import { MessageLogger } from './msg/logger.js';
import logger, { LOG_LEVEL } from './logger.js';
import { Session } from './session.js';
import { isDev, clearConsole} from './utils.js';
import {
    CredentialsMayHaveExpiredError,
    CantRecoverSessionError,
    WhatsAppWebTimeoutError,
    NewMessageReadingFailedWarn,
    QRCodeScanningError,
    UnknownQRCodeElementState,
    QRCodeScanningTimeoutError,
    CantReceiveMessagesWarn,
    RefreshScheduledWarn,
    WhatsAppWebLaunchError
} from './errors.js';
import packageConfig from '../package.json';
import { encode } from './b64.js';

async function _computeLastPushnameKey(lastwid, KEY_LAST_PUSHNAME) {
    const key = `${lastwid}:${KEY_LAST_PUSHNAME}`;
    let cache = {};
    return () => {
        const cached = cache[key];
        if (cached) {
            return cached;
        }
        return cache[key] = encode(md5(key));
    }
}

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

        this._waGlobals = {};
        this._getLastPushnameKey = function() {};
        this._needRefresh = false;
        this._needRefreshAttempts = 0;
        this._init();
    }

    log(msg) {
        this._msgLogger.log(msg);
    }

    /*
        saves user's session
    */
    async save() {
        let sessionItems = await this._page.evaluate(() =>  getSession());
        await this._sessionManager.save(sessionItems);
    }

    /*
        restores user's session
    */
    async restore() {
        return await this._sessionManager.restore(this._page);
    }

    async _isLoggedIn() {
        return await this._page.evaluate(() => isLoggedIn());
    }

    async _setupLoadWatcher() {
        return await this._page.evaluate(() => waitForReady());
    }

    async _getLastWID() {
        return await this._page.evaluate(() => getLastWID());
    }

    async _hasPushname() {
        const key = await this._getLastPushnameKey();
        return await this._page.evaluate((item) => storageHas(item), key);
    }

    /*
        _canReceiveMessages checks if the session can receive messages. eg. a user
        can be logged in but another session has been opened on any other device.
        Since Whatsapp Web only allows 1 session at a time it won't receive any
        message
    */
    async _canReceiveMessages() {
        return await this._hasPushname();
    }

    /*
        _check will check the login status after `msToCheck` milliseconds.
        If a callback `cb` is provided, it'll execute the callback after the
        time has elapsed, otherwise the function turns into a recursive one with
        a pre-defined behaviour.
    */
    _check(msToCheck, cb) {
        setTimeout(async () => {
            logger.verbose('checking login state..');
            const isLoggedIn = await this._isLoggedIn();
            if (cb) {
                return cb(isLoggedIn);
            }

            if (!isLoggedIn) {
                return new CredentialsMayHaveExpiredError({
                    page: this._page
                });
            }

            if (this._needRefreshAttempts >= NEED_REFRESH_COUNTER_BEFORE_FAIL) {
                return new CantRecoverSessionError({
                    page: this._page
                });
            }

            if (this._needRefresh) {
                this._needRefreshAttempts++;
                this._needRefresh = false;
                logger.verbose("attempting to recover the session.. [attempt #%s]", this._needRefreshAttempts);
                this._reload(true);
            } else if (!await this._canReceiveMessages()) {
                new CantReceiveMessagesWarn({
                    page: this._page
                });
                new RefreshScheduledWarn({
                    page: this._page
                });
                this._needRefresh = true;
            } else {
                this._needRefreshAttempts = 0;
            }

            if (program.screenshot) {
                await this.takeScreenshot(CHECK_LAST_SCREENSHOT_FILENAME);
            }
            this._check(msToCheck);
        }, msToCheck);
    }

    /*
        _onWAMessage handles new message events
    */
    _onWAMessage(evt) {
        let msg;

        try {
             msg = extract(evt);
            if (msg.isMedia()) {
                msg.downloadAndDecrypt();
            }
            this.log(msg);
        } catch(e) {
            return new NewMessageReadingFailedWarn({
                page: this._page
            });
        }

        const log = msg.isGroup()
            ? `-> Group ${msg.sender} [${msg.at}] (${msg.participant}) ${msg.toString()}`
            : `-> ${msg.sender} [${msg.at}] ${msg.toString()}`
        logger.verbose(log);
    }

    /*
        _onWAReady handles 'wa:ready' event. ie. When WhatsApp web has finished
        loading and user is logged in
    */
    async _onWAReady() {
        logger.verbose("WhatsApp Web finished loading");
        await this._setLastPushnameKeyFunction();
        await this._startMiddleman();
    }

    async _setLastPushnameKeyFunction() {
        const { KEY_LAST_PUSHNAME } = await this._getWAGlobals();
        this._getLastPushnameKey = await _computeLastPushnameKey(
            await this._getLastWID(),
            this._waGlobals.KEY_LAST_PUSHNAME = KEY_LAST_PUSHNAME,
        );
    }

    /*
        _onWATimeout handles wa:ready-timeout event. ie. When the time limit for
        'wa:read' event has been exceeded
    */
    async _onWATimeout() {
        if (!await this._isLoggedIn()) {
            return new CredentialsMayHaveExpiredError({
                page: this._page
            });
        }
        return new WhatsAppWebTimeoutError({
            page: this._page
        });
    }

    async takeScreenshot(name = 'screenshot') {
        await this._page.screenshot({
            path: `logs/${name}.png`
        });
        logger.verbose("saved screenshot of WhatsApp Web's page: logs/%s.png", name);
    }

    /*
        _addScript injects the needed scripts to the page
    */
    async _addScript() {
        logger.verbose('injecting hooks into the page...')
        await this._page.addScriptTag({
             path: './src/hook/connect.js'
        });
    }

    /*
        _reload refreshes the page and injects the needed scripts again. If
        `exec` = true it'll execute the middleman when available.
    */
    async _reload(exec) {
        await this._page.reload({
            waitUntil: 'domcontentloaded',
        });
        logger.verbose('page refreshed');
        await this._addScript();

        if (exec) {
            await this._setupLoadWatcher();
        }
    }

    /*
        _launch handles the chromium launch process. In production mode the
        browser will be in headless mode
    */
    async _launch() {
        let launchOpts = {
            headless: !isDev,
            devtools: isDev,
            dumpio: !!program.dumpio,
            args: [
                '--lang=en-US,en;q=0.9',
                '--remote-debugging-port=9222',
                `--user-agent=${USER_AGENT}`,
            ],
        };

        if (program.browser) {
            logger.verbose("using chromium from %s", program.browser);
            launchOpts.executablePath = program.browser;
        }

        this._browser = await puppeteer.launch(launchOpts);
        logger.verbose("using %s", await this._browser.version());
        logger.verbose("user-agent: %s", await this._browser.userAgent());
        this._page = await this._browser.newPage();

        logger.verbose("exposing emitter...");
        await this._page.exposeFunction("emit", (event, ...args) =>
        this._tracker.emit(event, ...args)
        );

        logger.verbose("navigating to %s...", WHATSAPP_WEB_URL);
        await this._page.goto(WHATSAPP_WEB_URL);
        await this._addScript();

        if (await this.restore()) {
            await this._reload();
        }
    }

    /*
        _getWAGlobals uses the injected function getConstants to retrieve
        the WhatsApp internal globals
    */
    async _getWAGlobals() {
        return await this._page.evaluate(() => getConstants());
    }

    /*
        _hasQRCode determines if the QRCODE element is present
    */
    async _hasQRCode() {
        return await this._page.$(QRCODE_SELECTOR) !== null;
    }

    /*
        _getCode attempts to retrieve the QRCode content code from the QRCode
        element
    */
    async _getCode() {
        let code = await this._page.$eval(QRCODE_SELECTOR, (el, attr) => el.getAttribute(attr), CODE_ATTRIBUTE);
        if (!code) {
            throw new Error("session code couldn't be read");
        }
        return code;
    }

    /*
        _drawQR displays a QRCode with the provided `code` content, in the
        terminal
    */
    _drawQR(code) {
        clearConsole();
        logger.info('Scan the following QRCode with your WhatsApp app: ')
        logger.verbose("got session code '%s'", code);
        qrcode.generate(code, {
            small: true,
        });
    }

    /*
        _waitForQRCode waits for QRCode element to be present in the DOM
    */
    async _waitForQRCode() {
        return await this._page.waitForSelector(QRCODE_SELECTOR, {
            timeout: QRCODE_WAIT_TIMEOUT,
        });
    }

    /*
        waitForLogin checks if user is logged in until it is or time expires.

        As the login process takes time, you'll need to wait a while before
        checking if user is logged in right after the login process has started.
    */
    async _waitForLogin() {
        return new Promise(resolve => {
            let timeout, timer;
            timeout = setTimeout(() => {
                clearInterval(timer);
                resolve(LOGIN_STATUS.TIMEOUT);
            }, LOGIN_OBSERVE_TIMEOUT);

            timer = setInterval(async () => {
                if (await this._isLoggedIn()) {
                    clearTimeout(timeout);
                    clearInterval(timer);
                    resolve(LOGIN_STATUS.LOGGED_IN);
                }
            }, LOGIN_OBSERVE_INTERVAL);
        });
    }

    /*
        _refreshQR takes care of the QRCode rotation process
    */
    async _refreshQR(code) {
        return new Promise(resolve => {
            let timeout, timer, newCode;

            timeout = setTimeout(() => {
                clearInterval(timer);
                resolve(QR_SCAN_STATUS.TIMEOUT);
            }, QR_ROTATION_TIMEOUT - EXPIRATION_MARGIN);

            logger.info("waiting for login..")
            timer = setInterval(async () => {
                if (!await this._hasQRCode()) {
                    clearTimeout(timeout);
                    clearInterval(timer);

                    process.stdout.write(".");
                    switch(await this._waitForLogin()) {
                        case LOGIN_STATUS.LOGGED_IN:
                            return resolve(QR_SCAN_STATUS.SCANNED);
                        case LOGIN_STATUS.TIMEOUT:
                        default:
                            return resolve(QR_SCAN_STATUS.ERROR);
                    }
                }

                newCode = await this._getCode();
                if (newCode !== code) {
                    this._drawQR(code = newCode);
                }
            }, QR_OBSERVE_INTERVAL);
        });
    }

    /*
        _startQR takes a given code (the first one) and start the QRCode
        rotation process
    */
    async _startQR(code) {
        this._drawQR(code);

        let res;
        try {
            res = await this._refreshQR(code)
        } catch(e) {
            return new QRCodeScanningError({
                page: this._page,
                message: e.message
            });
        }

        switch (res) {
            case QR_SCAN_STATUS.SCANNED:
                clearConsole();
                logger.info('login succeeded');
                this.save();
                break;
            case QR_SCAN_STATUS.TIMEOUT:
                return new QRCodeScanningTimeoutError({
                    page: this._page
                });
            case QR_SCAN_STATUS.ERROR:
            default:
                return new UnknownQRCodeElementState({
                    page: this._page
                });
        }
        return true;
    }

    /*
        _startMiddleman handles the injection process to intercept new
        messages
    */
    async _startMiddleman() {
        logger.verbose("injecting function..");
        await this._page.evaluate(() => inject(emitMessage));
        logger.info("ready");
        logger.info("waiting for new messages, do not stop the process..");
    }

    async _init() {
        logger.info(
            '[%s v%s]: new instance from %s; dev_mode=%s; log_level=%s; screenshot_on_err=%s; dumpio=%s',
            packageConfig.name,
            packageConfig.version,
            process.cwd(),
            isDev,
            LOG_LEVEL,
            !!program.screenshot,
            !!program.dumpio,
        );

        let code;
        try {
            await this._launch();
            if (!await this._isLoggedIn()) {
                await this._waitForQRCode();
                code = await this._getCode();
                await this._startQR(code);
            }

            logger.info("waiting for WhatsApp Web to load..")
            await this._setupLoadWatcher();
            this._check(CHECK_INTERVAL);

        } catch(e) {
            new WhatsAppWebLaunchError({
                page: this._page,
                message: e.message
            });
        }
    }
}
