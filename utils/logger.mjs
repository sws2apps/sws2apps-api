// this module is to log outside of res.on('finish')

// dependency
import moment from 'moment';
import requestIp from 'request-ip';

export const logger = (req, type, message) => {
	let log = '';
	if (process.env.NODE_ENV !== 'production') {
		log += `[${moment().format('YYYY-MM-DD HH:mm:ss')}] - `;
	}

	log += `${type} - `;
	if (req) {
		const clientIp = requestIp.getClientIp(req);
		log += `from ${req.origin || req.hostname}(${clientIp}) - `;
		log += `to ${req.path} - `;
		log += `using ${req.method} - `;
	}
	log += `${message}`;

	console.log(log);
};
