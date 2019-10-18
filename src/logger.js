import { LOG_DIR_NAME } from './consts';
import { createLogger, format, transports } from 'winston';
import { join } from 'path';

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.colorize(),
        format.splat(),
        format.timestamp(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
    transports: [
        new transports.File({
            filename: join(LOG_DIR_NAME, 'error.log'),
            level: 'error',
            format: format.uncolorize(),
        }),
        new transports.File({
            filename: join(LOG_DIR_NAME, 'app.log'),
            format: format.uncolorize(),
        }),
        new transports.Console(),
    ],
});

export default logger;