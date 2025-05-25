import { NextFunction, Request, Response } from 'express';
import { LogLevel } from '@logtail/types';
import geoip from 'geoip-lite';
import WhichBrowser from 'which-browser';

import { API_VAR } from '../../index.js';
import { logger } from '../services/logger/logger.js';

export const updateTracker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const start = process.hrtime();
			const { REQUEST_TRACKER } = API_VAR;

			const clientIp = req.clientIp!;
			const geo = geoip.lookup(clientIp);
			const browserInfo = new WhichBrowser(req.headers);
			const reqCity = geo ? `${geo.city} (${geo.country})` : 'Unknown';
			const ipIndex = REQUEST_TRACKER.findIndex((client) => client.ip === clientIp);

			// Initialize response size counter
			let responseSize = 0;

			// Override res.write
			const originalWrite = res.write.bind(res);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			res.write = (chunk: any, ...args: any[]) => {
				if (chunk) {
					responseSize += Buffer.byteLength(chunk);
				}
				return originalWrite(chunk, ...args);
			};

			// Override res.end
			const originalEnd = res.end.bind(res);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			res.end = (chunk: any, ...args: any[]) => {
				if (chunk) {
					responseSize += Buffer.byteLength(chunk);
				}
				return originalEnd(chunk, ...args);
			};

			res.on('close', () => {
				const [s, ns] = process.hrtime(start);
				const ms = Math.round(s * 1e3 + ns / 1e6);

				const message = (res.locals.message ?? '').replace(/\n|\r/g, '');
				const user = res.locals.currentUser;

				const context = {
					method: req.method,
					status: res.statusCode,
					path: req.originalUrl,
					origin: req.hostname ?? req.headers.origin,
					ip: clientIp,
					browser: browserInfo.browser.toString(),
					userId: user?.id,
					congregationId: user?.profile.congregation?.id,
					duration: ms,
					size: responseSize,
				};

				let failedLoginAttempt = 0;

				if (res.writableEnded) {
					if (res.locals.failedLoginAttempt) {
						const reqTrackRef = REQUEST_TRACKER.find((client) => client.ip === clientIp);
						failedLoginAttempt = (reqTrackRef?.failedLoginAttempt ?? 0) + 1;

						REQUEST_TRACKER.splice(ipIndex, 1);
						REQUEST_TRACKER.push({
							ip: clientIp,
							city: reqCity,
							reqInProgress: false,
							failedLoginAttempt,
							retryOn: undefined,
						});
					} else {
						REQUEST_TRACKER.splice(ipIndex, 1);
					}

					logger(res.locals.type as LogLevel, message, {
						...context,
						failed_attempt: failedLoginAttempt,
					});
				} else {
					if (ipIndex >= 0) {
						REQUEST_TRACKER.splice(ipIndex, 1);
					}

					res.status(400);
					logger(LogLevel.Warn, message, context);
				}
			});

			next();
		} catch (err) {
			next(err);
		}
	};
};
