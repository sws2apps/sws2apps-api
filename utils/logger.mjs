// this module is to log outside of res.on('finish')

// dependency
import moment from 'moment';
import requestIp from 'request-ip';

export const logger = (type, message, req, res) => {
	let log = '';
	if (process.env.NODE_ENV !== 'production') {
		log += `[${moment().format('YYYY-MM-DD HH:mm:ss')}] - `;
	}

	log += `at=${type} `;
	if (req && res) {
		const clientIp = requestIp.getClientIp(req);
		log += `method=${req.method} `;
		log += `status=${res.statusCode} `;
		log += `path="${req.originalUrl}" `;
		log += `fwd="${req.headers.origin || req.hostname}(${clientIp})" `;
	}
	log += `msg="${message}"`;

	console.log(log);
};
