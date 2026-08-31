import { NextFunction, Request, Response } from 'express';
import isOnline from 'is-online';
import { LogLevel } from '@logtail/types';
import { logger } from '../../platform/logging/logger.js';

type InternetCheck = () => Promise<boolean>;

export const createCachedInternetCheck = (
	checkInternetConnection: InternetCheck,
	cacheDurationMs = 30_000,
	getCurrentTime = Date.now,
): InternetCheck => {
	let cachedResult: boolean | undefined;
	let cachedAt = 0;
	let pendingCheck: Promise<boolean> | undefined;

	return async () => {
		if (cachedResult !== undefined) {
			const cacheAge = getCurrentTime() - cachedAt;
			if (cacheAge < cacheDurationMs) return cachedResult;
		}

		if (!pendingCheck) {
			pendingCheck = checkInternetConnection()
				.then((isConnected) => {
					cachedResult = isConnected;
					cachedAt = getCurrentTime();
					return isConnected;
				})
				.finally(() => {
					pendingCheck = undefined;
				});
		}

		return pendingCheck;
	};
};

export const requireInternetConnection = (
	checkInternetConnection: InternetCheck = createCachedInternetCheck(isOnline),
) => {
	return async (_request: Request, response: Response, next: NextFunction) => {
		try {
			const isConnected = await checkInternetConnection();

			if (isConnected) {
				next();
				return;
			}

			response.status(500).json({ message: 'INTERNAL_ERROR' });
			logger(LogLevel.Warn, 'the server could not make request to the internet');
		} catch (error) {
			next(error);
		}
	};
};
