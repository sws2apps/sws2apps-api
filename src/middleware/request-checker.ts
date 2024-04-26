import { NextFunction, Request, Response } from 'express';
import geoip from 'geoip-lite';
import { API_VAR } from '../index.js';
import { RequestTrackerType } from '../denifition/server.js';

export const requestChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { REQUEST_TRACKER } = API_VAR;
			const clientIp = req.clientIp!;

			const geo = geoip.lookup(clientIp);

			const reqCity = geo === null ? 'Unknown' : `${geo.city} (${geo.country})`;

			const reqTrackRef = REQUEST_TRACKER.find((client) => client.ip === clientIp);

			if (reqTrackRef) {
				const { retryOn, failedLoginAttempt } = reqTrackRef;

				const ipIndex = REQUEST_TRACKER.findIndex((client) => client.ip === clientIp);

				if (retryOn) {
					const currentDate = new Date().getTime();
					if (currentDate < retryOn) {
						res.locals.type = 'warn';
						res.locals.message = 'login from this IP address has been blocked temporarily due to many failed attempts';
						res.status(403).json({ message: 'BLOCKED_TEMPORARILY_TRY_AGAIN' });
					} else {
						REQUEST_TRACKER.splice(ipIndex, 1);
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

							const ipIndex = REQUEST_TRACKER.findIndex((client) => client.ip === clientIp);

							REQUEST_TRACKER.splice(ipIndex, 1);

							const obj: RequestTrackerType = {
								ip: clientIp,
								city: reqCity,
								reqInProgress: false,
								failedLoginAttempt: 3,
								retryOn: retryDate,
							};

							REQUEST_TRACKER.push(obj);
						});
					} else {
						REQUEST_TRACKER.splice(ipIndex, 1);

						const obj: RequestTrackerType = {
							ip: clientIp,
							city: reqCity,
							reqInProgress: true,
							failedLoginAttempt: failedLoginAttempt,
							retryOn: undefined,
						};

						REQUEST_TRACKER.push(obj);
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

				REQUEST_TRACKER.push(obj);

				next();
			}
		} catch (err) {
			next(err);
		}
	};
};
