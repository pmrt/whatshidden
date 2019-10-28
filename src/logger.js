import { LOG_DIR_NAME } from './consts.js';
import winston from 'winston';
import { join } from 'path';

export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.printf(info => `[${new Date().toLocaleString()}] ${info.level}: ${info.message}`),
    ),
    transports: [
        new winston.transports.File({
            filename: join(LOG_DIR_NAME, 'error.log'),
            level: 'error',
            format: winston.format.uncolorize(),
        }),
        new winston.transports.File({
            filename: join(LOG_DIR_NAME, 'app.log'),
            format: winston.format.uncolorize(),
        }),
        new winston.transports.Console(),
    ],
});

export default logger;