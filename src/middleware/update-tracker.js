// dependencies
import geoip from 'geoip-lite';
import { getFirestore } from 'firebase-admin/firestore';

// utils import
import { logger } from '../utils/logger.js';

// get firestore
const db = getFirestore();

export const updateTracker = () => {
	return async (req, res, next) => {
		try {
			const geo = geoip.lookup(req.clientIp);

			const reqCity = geo === null ? 'Unknown' : `${geo.city} (${geo.country})`;

			const clientIp = req.clientIp;
			const ipIndex = requestTracker.findIndex(
				(client) => client.ip === clientIp
			);

			res.on('close', () => {
				if (res.finished) {
					let failedLoginAttempt = 0;

					if (res.locals.failedLoginAttempt) {
						const reqTrackRef = requestTracker.find(
							(client) => client.ip === clientIp
						);

						failedLoginAttempt = reqTrackRef?.failedLoginAttempt || 0;
						failedLoginAttempt = failedLoginAttempt + 1;

						requestTracker.splice(ipIndex, 1);

						let obj = {};
						obj.ip = clientIp;
						obj.city = reqCity;
						obj.reqInProgress = false;
						obj.failedLoginAttempt = failedLoginAttempt;
						obj.retryOn = '';

						requestTracker.push(obj);
					} else {
						requestTracker.splice(ipIndex, 1);
					}

					let log = {};

					log.method = req.method;
					log.status = res.statusCode;
					log.path = res.originalUrl;
					log.origin = req.headers.origin || `${req.hostname}(${clientIp}) `;
					log.details = res.locals.message.replace(/\n|\r/g, '');

					logger(res.locals.type, JSON.stringify(log));
				} else {
					if (ipIndex >= 0) {
						requestTracker.splice(ipIndex, 1);
					}
					res.status(400);

					let log = {};

					log.method = req.method;
					log.status = res.statusCode;
					log.path = res.originalUrl;
					log.origin = req.headers.origin || `${req.hostname}(${clientIp}) `;
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
