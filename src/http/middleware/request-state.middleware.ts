import { NextFunction, Request, Response } from 'express';
import geoip from 'geoip-lite';
import { serverState } from '#platform/runtime/server-state.js';
import {
	findRequestTrackerEntry,
	hasReachedFailedRequestLimit,
	removeRequestTrackerEntry,
	setRequestTrackerEntry,
	type RequestTrackerType,
} from '#platform/runtime/request-tracker.js';
import { sendClientError } from '#http/responses.js';

const blockedRequestLogMessage =
	'login from this IP address has been blocked temporarily due to many failed attempts';

export const trackRequestState = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const requestTracker = serverState.requestTracker;
			const clientIp = req.clientIp!;

			const geo = geoip.lookup(clientIp);

			const reqCity = geo === null ? 'Unknown' : `${geo.city} (${geo.country})`;

			const reqTrackRef = findRequestTrackerEntry(requestTracker, clientIp);

			if (reqTrackRef) {
				const { retryOn, failedLoginAttempt } = reqTrackRef;

				if (retryOn) {
					const currentDate = new Date().getTime();
					if (currentDate < retryOn) {
						sendClientError(
							res,
							403,
							'BLOCKED_TEMPORARILY_TRY_AGAIN',
							blockedRequestLogMessage,
						);
					} else {
						removeRequestTrackerEntry(requestTracker, clientIp);
						next();
					}
				} else {
					if (hasReachedFailedRequestLimit(failedLoginAttempt)) {
						sendClientError(
							res,
							403,
							'BLOCKED_TEMPORARILY',
							blockedRequestLogMessage,
						);

						res.on('finish', async () => {
							const currentD = new Date();
							const retryDate = currentD.getTime() + 15 * 60000;

							const obj: RequestTrackerType = {
								ip: clientIp,
								city: reqCity,
								reqInProgress: false,
								failedLoginAttempt: 3,
								retryOn: retryDate,
							};

							setRequestTrackerEntry(requestTracker, obj);
						});
					} else {
						const obj: RequestTrackerType = {
							ip: clientIp,
							city: reqCity,
							reqInProgress: true,
							failedLoginAttempt: failedLoginAttempt,
							retryOn: undefined,
						};

						setRequestTrackerEntry(requestTracker, obj);
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

				setRequestTrackerEntry(requestTracker, obj);

				next();
			}
		} catch (err) {
			next(err);
		}
	};
};
