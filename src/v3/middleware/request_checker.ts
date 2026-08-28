import { NextFunction, Request, Response } from 'express';
import geoip from 'geoip-lite';
import { serverState } from '../../platform/runtime/server-state.js';
import { RequestTrackerType } from '../definition/server.js';

export const requestChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const requestTracker = serverState.requestTracker;
			const clientIp = req.clientIp!;

			const geo = geoip.lookup(clientIp);

			const reqCity = geo === null ? 'Unknown' : `${geo.city} (${geo.country})`;

			const reqTrackRef = requestTracker.find((client) => client.ip === clientIp);

			if (reqTrackRef) {
				const { retryOn, failedLoginAttempt } = reqTrackRef;

				const ipIndex = requestTracker.findIndex((client) => client.ip === clientIp);

				if (retryOn) {
					const currentDate = new Date().getTime();
					if (currentDate < retryOn) {
						res.locals.type = 'warn';
						res.locals.message = 'login from this IP address has been blocked temporarily due to many failed attempts';
						res.status(403).json({ message: 'BLOCKED_TEMPORARILY_TRY_AGAIN' });
					} else {
						requestTracker.splice(ipIndex, 1);
						next();
					}
				} else {
					if (failedLoginAttempt === 3) {
						res.locals.type = 'warn';
						res.locals.message = 'login from this IP address has been blocked temporarily due to many failed attempts';
						res.status(403).json({ message: 'BLOCKED_TEMPORARILY' });

						res.on('finish', async () => {
							const currentD = new Date();
							const retryDate = currentD.getTime() + 15 * 60000;

							const ipIndex = requestTracker.findIndex((client) => client.ip === clientIp);

							requestTracker.splice(ipIndex, 1);

							const obj: RequestTrackerType = {
								ip: clientIp,
								city: reqCity,
								reqInProgress: false,
								failedLoginAttempt: 3,
								retryOn: retryDate,
							};

							requestTracker.push(obj);
						});
					} else {
						requestTracker.splice(ipIndex, 1);

						const obj: RequestTrackerType = {
							ip: clientIp,
							city: reqCity,
							reqInProgress: true,
							failedLoginAttempt: failedLoginAttempt,
							retryOn: undefined,
						};

						requestTracker.push(obj);
						next();
					}
				}
			} else {
				const obj: RequestTrackerType = {
					ip: clientIp,
					city: reqCity,
					reqInProgress: true,
					failedLoginAttempt: 0,
					retryOn: undefined,
				};

				requestTracker.push(obj);

				next();
			}
		} catch (err) {
			next(err);
		}
	};
};
