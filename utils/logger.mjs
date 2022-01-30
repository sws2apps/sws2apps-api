// dependency import
import 'dotenv/config';
import { Logger } from 'heroku-logger';

export const logger = (level, message) => {
	if (process.env.NODE_ENV !== 'testing') {
		const logger = new Logger();

		if (level === 'info') {
			logger.info(message);
		} else if (level === 'warn') {
			logger.warn(message);
		} else if (level === 'error') {
			logger.error(message);
		}
	}
};
