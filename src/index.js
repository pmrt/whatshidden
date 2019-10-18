import puppeteer from 'puppeteer';

import { USER_AGENT, WHATSAPP_WEB_URL } from './consts';
import logger  from './logger';
import { isProd } from './utils';
import { version } from '../package.json';

async function launch() {
    const browser = await puppeteer.launch({
        headless: isProd,
    });
    logger.verbose("using %s", await browser.version());
    const page = await browser.newPage();
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
        const { page } = await launch();
        code = await getSessionCode(page);
    } catch(e) {
        logger.error(e);
        process.exit(1);
    }

    logger.verbose("got session code '%s'", code)
}

init();