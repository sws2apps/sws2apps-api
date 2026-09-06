import { NextFunction, Request, Response } from 'express';
import { LogLevel } from '@logtail/types';
import geoip from 'geoip-lite';

import { serverState } from '#platform/runtime/server-state.js';
import { logger } from '#platform/logging/logger.js';
import { calculateJsonSize } from '#http/request-size.js';
import { getRequestLogPath } from '#http/request-log-path.js';
import {
	findRequestTrackerEntry,
	removeRequestTrackerEntry,
	setRequestTrackerEntry,
} from '#platform/runtime/request-tracker.js';

export const logRequestCompletion = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const start = process.hrtime();
			const requestTracker = serverState.requestTracker;

			const clientIp = req.clientIp!;
			const geo = geoip.lookup(clientIp);
			const reqCity = geo ? `${geo.city} (${geo.country})` : 'Unknown';
			const requestSize = calculateJsonSize(req.body);

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

				const message = (res.locals.message ?? '').replace(/[\n\r]/g, '');
				const memory = process.memoryUsage();

				const context = {
					method: req.method,
					status: res.statusCode,
					path: getRequestLogPath(req),
					duration: ms,
					request_size: requestSize,
					response_size: responseSize,
					rss_size: memory.rss,
					heap_total_size: memory.heapTotal,
					heap_used_size: memory.heapUsed,
					array_buffers_size: memory.arrayBuffers,
				};

				let failedLoginAttempt = 0;

				if (res.writableEnded) {
					if (res.locals.failedLoginAttempt) {
						const reqTrackRef = findRequestTrackerEntry(requestTracker, clientIp);
						failedLoginAttempt = (reqTrackRef?.failedLoginAttempt ?? 0) + 1;

						setRequestTrackerEntry(requestTracker, {
							ip: clientIp,
							city: reqCity,
							reqInProgress: false,
							failedLoginAttempt,
							retryOn: undefined,
						});
					} else {
						removeRequestTrackerEntry(requestTracker, clientIp);
					}

					logger(res.locals.type, message, {
						...context,
						failed_attempt: failedLoginAttempt,
					});
				} else {
					removeRequestTrackerEntry(requestTracker, clientIp);

					res.status(400);
					logger(LogLevel.Warn, 'request aborted and cannot be completed', context);
				}
			});

			next();
		} catch (err) {
			next(err);
		}
	};
};
