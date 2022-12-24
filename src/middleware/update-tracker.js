import geoip from 'geoip-lite';
import { logger } from '../utils/logger.js';

export const updateTracker = () => {
	return async (req, res, next) => {
		try {
			const geo = geoip.lookup(req.clientIp);

			const reqCity = geo === null ? 'Unknown' : `${geo.city} (${geo.country})`;

			const clientIp = req.clientIp;
			const ipIndex = global.requestTracker.findIndex((client) => client.ip === clientIp);

			res.on('close', () => {
				if (res.finished) {
					let failedLoginAttempt = 0;

					if (res.locals.failedLoginAttempt) {
						const reqTrackRef = global.requestTracker.find((client) => client.ip === clientIp);

						failedLoginAttempt = reqTrackRef?.failedLoginAttempt || 0;
						failedLoginAttempt = failedLoginAttempt + 1;

						global.requestTracker.splice(ipIndex, 1);

						let obj = {};
						obj.ip = clientIp;
						obj.city = reqCity;
						obj.reqInProgress = false;
						obj.failedLoginAttempt = failedLoginAttempt;
						obj.retryOn = '';

						global.requestTracker.push(obj);
					} else {
						global.requestTracker.splice(ipIndex, 1);
					}

					let log = {};

					log.method = req.method;
					log.status = res.statusCode;
					log.path = req.originalUrl;
					log.origin = req.headers.origin || req.hostname;
					if (clientIp) log.ip = clientIp;
					log.details = res.locals.message.replace(/\n|\r/g, '');

					logger(res.locals.type, JSON.stringify(log));
				} else {
					if (ipIndex >= 0) {
						global.requestTracker.splice(ipIndex, 1);
					}
					res.status(400);

					let log = {};

					log.method = req.method;
					log.status = res.statusCode;
					log.path = req.originalUrl;
					log.origin = req.headers.origin || req.hostname;
					if (clientIp) log.ip = clientIp;
					log.details = 'this request was aborted';

					logger('warn', JSON.stringify(log));
				}
			});

			next();
		} catch (err) {
			next(err);
		}
	};
};
