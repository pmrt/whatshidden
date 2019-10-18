import puppeteer from 'puppeteer';

import { USER_AGENT, WHATSAPP_WEB_URL, GRACEFULLY_CLOSE_TIMEOUT } from './consts';
import logger  from './logger';
import { isProd } from './utils';
import { version } from '../package.json';

let browser, page;

// TODO - Keep trying until getting session code or until timeout
//  - Observe and refresh session code when it changes
//  - Exit application if no qrcode is scanned when whatsapp qr scanning timeouts
// TODO - Store & retrieve pass sessions so it doesn't have to scan the qrcode again
// TODO - Get all the incoming messages, download attachments if the message is an image/voice/video/document and store them into db.
//  - Get each message
//  - Check if it's raw text, if it's not download it and reference it in the db.
// TODO - HTML Preview of the chats (v2)

async function launch() {
    browser = await puppeteer.launch({
        headless: isProd,
    });
    logger.verbose("using %s", await browser.version());
    page = await browser.newPage();
    logger.verbose("changing user-agent to '%s'", USER_AGENT);

    page.setUserAgent(USER_AGENT);
    await page.goto(WHATSAPP_WEB_URL);

    return { browser, page };
}

async function getSessionCode(page) {
    let code = await page.$eval('[data-ref]', el => el.getAttribute('data-ref'));
    if (!code) {
        throw new Error("session code couldn't be read");
    }
    return code;
}

async function init() {
    logger.info('[Whatslogged v%s]: new instance; prod-mode=%s', version, isProd);

    let code;
    try {
        await launch();
        code = await getSessionCode(page);
    } catch(e) {
        logger.error(e);
        browser.close();
        setTimeout(() => {
            process.exit(1);
        }, GRACEFULLY_CLOSE_TIMEOUT);
    }

    logger.verbose("got session code '%s'", code);
}

init();