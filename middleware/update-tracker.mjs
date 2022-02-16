// dependencies
import { getFirestore } from 'firebase-admin/firestore';

// utils import
import { logger } from '../utils/logger.mjs';

// get firestore
const db = getFirestore();

export const updateTracker = () => {
	return async (req, res, next) => {
		try {
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
						obj.reqInProgress = false;
						obj.failedLoginAttempt = failedLoginAttempt;
						obj.retryOn = '';

						requestTracker.push(obj);
					} else {
						requestTracker.splice(ipIndex, 1);
					}

					let log = '';
					log += `method=${req.method} `;
					log += `status=${res.statusCode} `;
					log += `path=${req.originalUrl} `;
					log += `origin=${req.headers.origin || req.hostname}(${clientIp}) `;
					log += `details=${res.locals.message}`;

					logger(res.locals.type, log);
				} else {
					if (ipIndex >= 0) {
						requestTracker.splice(ipIndex, 1);
					}
				}
			});

			next();
		} catch (err) {
			next(err);
		}
	};
};
