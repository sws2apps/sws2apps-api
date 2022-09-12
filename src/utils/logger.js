// dependency import
import winston from 'winston';

export const logger = (level, message) => {
	const logger = winston.createLogger({
		level: 'info',
		format: winston.format.combine(
			winston.format.timestamp(),
			winston.format.json()
		),
		transports: [new winston.transports.Console()],
	});

	let msg = message.replace(/\n|\r/g, '');

	if (level === 'info') {
		logger.info(msg);
	} else if (level === 'warn') {
		logger.warn(msg);
	} else if (level === 'error') {
		logger.error(msg);
	}
};
