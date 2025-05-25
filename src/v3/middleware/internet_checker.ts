import { NextFunction, Request, Response } from 'express';
import isOnline from 'is-online';
import { LogLevel } from '@logtail/types';
import { logger } from '../services/logger/logger.js';

export const internetChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			isOnline().then((result) => {
				if (result) {
					next();
				} else {
					res.status(500).json({ message: 'INTERNAL_ERROR' });
					logger(LogLevel.Warn, 'the server could not make request to the internet');
				}
			});
		} catch (err) {
			next(err);
		}
	};
};
