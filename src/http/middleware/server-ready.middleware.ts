import { NextFunction, Request, Response } from 'express';
import { serverState } from '#platform/runtime/server-state.js';
import { sendClientError } from '#http/responses.js';

export const serverReadyChecker = () => {
	return async (_request: Request, response: Response, next: NextFunction) => {
		if (serverState.isReady) {
			next();
			return;
		}

		response.set('Retry-After', '30');
		sendClientError(
			response,
			503,
			'SERVER_NOT_READY',
			'the server is not yet ready. try again later',
		);
	};
};
