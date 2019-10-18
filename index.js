const path = require('path');
const puppeteer = require('puppeteer');
const winston = require('winston');

const pkg = require('./package.json');

const WHATSAPP_WEB_URL = 'https://web.whatsapp.com';
const LOG_DIR_NAME = 'logs';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36';

const isProd = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(LOG_DIR_NAME, 'error.log'),
            level: 'error',
            format: winston.format.uncolorize(),
        }),
        new winston.transports.File({
            filename: path.join(LOG_DIR_NAME, 'app.log'),
            format: winston.format.uncolorize(),
        }),
        new winston.transports.Console(),
    ],
})

let browser, pg;

async function init() {
    logger.info('[Whatslogged v%s]: new instance; prod-mode=%s', pkg.version, isProd);

    browser = await puppeteer.launch({
        headless: isProd,
    });
    logger.verbose("Using %s", await browser.version());
    pg = await browser.newPage();
    logger.verbose("Changing user-agent to %s", USER_AGENT);
    pg.setUserAgent(USER_AGENT);

    await pg.goto(WHATSAPP_WEB_URL);

    const code = await pg.$eval('[data-ref]', el => el.getAttribute('data-ref'));
    console.log(code);

}

init();

