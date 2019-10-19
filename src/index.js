import puppeteer from 'puppeteer';

import { USER_AGENT, WHATSAPP_WEB_URL } from './consts';
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
    await page.addScriptTag({
         path: './src/hook/connect.js'
    });
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
    logger.info('[Whatslogged v%s]: new instance from %s; prod-mode=%s', version, process.cwd(), isProd);

    let code;
    try {
        await launch();
        code = await getSessionCode(page);
    } catch(e) {
        if (browser) {
            // unhandled promise errors - ignore them (we're just exiting)
            await browser.close();
        }
        logger.error(e);
        exit(1);
    }

    console.log(await page.evaluate(() =>  getConstants()));

    logger.verbose("got session code '%s'", code);
}

function exit(exitCode=0, warn) {
    logger.warn(warn);
    process.exit(exitCode);
}

process.on('SIGINT', (sig) => exit(0, "SIGNINT RECEIVED (stopped by user interaction)"));

init();