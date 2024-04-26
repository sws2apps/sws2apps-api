import { NextFunction, Request, Response } from 'express';
import isOnline from 'is-online';
import { logger } from '../services/logger/logger.js';
import { formatLog } from '../utils/format-log.js';

export const internetChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			isOnline().then((result) => {
				if (result) {
					next();
				} else {
					res.status(500).json({ message: 'INTERNAL_ERROR' });
					logger('warn', formatLog('the server could not make request to the internet', req, res));
				}
			});
		} catch (err) {
			next(err);
		}
	};
};
