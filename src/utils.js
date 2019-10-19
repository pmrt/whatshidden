import logger from './logger';

export const isProd = process.env.NODE_ENV === 'production';

export function exit(exitCode=0, warn) {
    if (warn) {
        logger.warn(warn);
    }
    process.exit(exitCode);
}