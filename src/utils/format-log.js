// this module is to log outside of res.on('finish')

// dependency
import requestIp from 'request-ip';

export const formatLog = (message, req, res) => {
	let log = {};

	if (req && res) {
		const clientIp = requestIp.getClientIp(req);
		log.method = req.method;
		log.status = res.statusCode;
		log.path = res.originalUrl;
		log.origin = req.headers.origin || req.hostname;
		if (clientIp) log.ip = clientIp
	}

	log.details = message.replace(/\n|\r/g, '');

	return JSON.stringify(log);
};
