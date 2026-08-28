import { NextFunction, Request, Response } from 'express';
import isOnline from 'is-online';
import { LogLevel } from '@logtail/types';
import { logger } from '../../platform/logging/logger.js';

export const requireInternetConnection = () => {
	return async (_request: Request, response: Response, next: NextFunction) => {
		try {
			const isConnected = await isOnline();

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
