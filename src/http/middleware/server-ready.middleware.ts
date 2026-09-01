import { NextFunction, Request, Response } from 'express';
import { serverState } from '#platform/runtime/server-state.js';

export const serverReadyChecker = () => {
	return async (_request: Request, response: Response, next: NextFunction) => {
		if (serverState.isReady) {
			next();
			return;
		}

		response.set('Retry-After', '30');
		response.locals.type = 'warn';
		response.locals.message = 'the server is not yet ready. try again later';
		response.status(503).json({ message: 'SERVER_NOT_READY' });
	};
};
