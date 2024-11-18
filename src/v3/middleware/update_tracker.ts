import { NextFunction, Request, Response } from 'express';
import geoip from 'geoip-lite';
import { API_VAR } from '../../index.js';
import { logger } from '../services/logger/logger.js';
import { RequestTrackerType } from '../definition/server.js';

export const updateTracker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { REQUEST_TRACKER } = API_VAR;
			const clientIp = req.clientIp!;

			const geo = geoip.lookup(clientIp);

			const reqCity = geo === null ? 'Unknown' : `${geo.city} (${geo.country})`;

			const ipIndex = REQUEST_TRACKER.findIndex((client) => client.ip === clientIp);

			res.on('close', () => {
				if (res.writableEnded) {
					let failedLoginAttempt = 0;

					if (res.locals.failedLoginAttempt) {
						const reqTrackRef = REQUEST_TRACKER.find((client) => client.ip === clientIp);

						failedLoginAttempt = reqTrackRef?.failedLoginAttempt || 0;
						failedLoginAttempt = failedLoginAttempt + 1;

						REQUEST_TRACKER.splice(ipIndex, 1);

						const obj: RequestTrackerType = {
							ip: clientIp,
							city: reqCity,
							reqInProgress: false,
							failedLoginAttempt: failedLoginAttempt,
							retryOn: undefined,
						};

						REQUEST_TRACKER.push(obj);
					} else {
						REQUEST_TRACKER.splice(ipIndex, 1);
					}

					const log = {
						method: req.method,
						status: res.statusCode,
						path: req.originalUrl,
						origin: req.headers.origin || req.hostname,
						ip: clientIp,
						details: res.locals.message?.replace(/\n|\r/g, '') || '',
					};

					logger(res.locals.type, JSON.stringify(log));

					return;
				}

				if (ipIndex >= 0) {
					REQUEST_TRACKER.splice(ipIndex, 1);
				}

				res.status(400);

				const log = {
					method: req.method,
					status: res.statusCode,
					path: req.originalUrl,
					origin: req.headers.origin || req.hostname,
					ip: clientIp,
					details: 'this request was aborted',
				};

				logger('warn', JSON.stringify(log));
			});

			next();
		} catch (err) {
			next(err);
		}
	};
};
