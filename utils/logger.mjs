// dependency import
import 'dotenv/config';
import { Logger } from 'heroku-logger';

export const logger = new Logger();

// import { createLogger, format, transports } from 'winston';
// const { combine, timestamp, printf } = format;

// const myFormat = printf(({ level, message, timestamp }) => {
// 	let log = '';
// 	if (process.env.NODE_ENV !== 'production') {
// 		log += `${timestamp} `;
// 	}
// 	log += `at=${level} `;
// 	log += `${message}`;

// 	return log;
// });

// export const logger = createLogger({
// 	level: 'info',
// 	format: format.json(),
// 	transports: [
// 		new transports.Console({
// 			level: 'info',
// 			format: combine(format.colorize(), timestamp(), myFormat),
// 		}),
// 	],
// });
