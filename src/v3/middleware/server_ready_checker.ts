import { NextFunction, Request, Response } from 'express';
import { API_VAR } from '../../index.js';

export const serverReadyChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		if (API_VAR.IS_SERVER_READY === true) {
			next();
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'the server is not yet ready. try again later';
			res.status(500).json({ message: 'SERVER_NOT_READY' });
		}
	};
};
