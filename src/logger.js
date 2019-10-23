import { LOG_DIR_NAME } from './consts';
import { createLogger, format, transports } from 'winston';
import { join } from 'path';

export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const logger = createLogger({
    level: LOG_LEVEL,
    format: format.combine(
        format.colorize(),
        format.splat(),
        format.printf(info => `[${new Date().toLocaleString()}] ${info.level}: ${info.message}`),
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