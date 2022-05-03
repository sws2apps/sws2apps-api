// dependency import
import { Logger } from 'heroku-logger';

export const logger = (level, message) => {
	const logger = new Logger();

	if (level === 'info') {
		logger.info(message);
	} else if (level === 'warn') {
		logger.warn(message);
	} else if (level === 'error') {
		logger.error(message);
	}
};
