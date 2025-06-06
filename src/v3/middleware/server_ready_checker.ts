import { NextFunction, Request, Response } from 'express';
import { API_VAR } from '../../index.js';

export const serverReadyChecker = () => {
	return async (_: Request, res: Response, next: NextFunction) => {
		if (API_VAR.IS_SERVER_READY === true) {
			next();
		} else {
			res.set('Retry-After', '30');
			res.locals.type = 'warn';
			res.locals.message = 'the server is not yet ready. try again later';
			res.status(503).json({ message: 'SERVER_NOT_READY' });
		}
	};
};
