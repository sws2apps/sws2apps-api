import type { NextFunction, Request, Response } from 'express';
import { sendClientError } from '#http/responses.js';

export const requireCurrentUserResource = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const authenticatedUserId = res.locals.currentUser?.id;
	const requestedUserId = req.params.id;

	if (authenticatedUserId && requestedUserId === authenticatedUserId) {
		next();
		return;
	}

	sendClientError(
		res,
		403,
		'error_api_unauthorized-request',
		'user is not authorized to access the requested account',
	);
};
