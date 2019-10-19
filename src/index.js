import puppeteer from 'puppeteer';

import { USER_AGENT, WHATSAPP_WEB_URL } from './consts';
import logger  from './logger';
import { isProd, exit } from './utils';
import { version } from '../package.json';

// TODO - Keep trying until getting session code or until timeout
//  - Observe and refresh session code when it changes
//  - Exit application if no qrcode is scanned when whatsapp qr scanning timeouts
// TODO - Store & retrieve pass sessions so it doesn't have to scan the qrcode again
// TODO - Get all the incoming messages, download attachments if the message is an image/voice/video/document and store them into db.
//  - Get each message
//  - Check if it's raw text, if it's not download it and reference it in the db.
// TODO - HTML Preview of the chats (v2)

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

    async getCode() {
        let code = await this.page.$eval('[data-ref]', el => el.getAttribute('data-ref'));
        if (!code) {
            throw new Error("session code couldn't be read");
        }
        return code;
    }

    async init() {
        logger.info('[Whatslogged v%s]: new instance from %s; prod-mode=%s', version, process.cwd(), isProd);

        let code;
        try {
            await this.launch();
            code = await this.getCode();
        } catch(e) {
            if (this.browser) {
                // unhandled promise errors - ignore them (we're just exiting)
                await this.browser.close();
            }
            logger.error(e);
            exit(1);
        }

        logger.verbose("got session code '%s'", code);
    }
}

process.on('SIGINT', (sig) => exit(0, "SIGNINT RECEIVED (stopped by user interaction)"));

new WAContainer();