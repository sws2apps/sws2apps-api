// this module is to log outside of res.on('finish')

// dependency
import requestIp from 'request-ip';

export const formatLog = (message, req, res) => {
	let log = '';

	if (req && res) {
		const clientIp = requestIp.getClientIp(req);
		log += `method=${req.method} `;
		log += `status=${res.statusCode} `;
		log += `path=${req.originalUrl} `;
		log += `origin=${req.headers.origin || req.hostname}(${clientIp}) `;
	}
	log += `details=${message}`;

	return log;
};
