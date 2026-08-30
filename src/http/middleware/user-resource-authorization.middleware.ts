import type { NextFunction, Request, Response } from 'express';

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

	res.locals.type = 'warn';
	res.locals.message = 'user is not authorized to access the requested account';
	res.status(403).json({ message: 'error_api_unauthorized-request' });
};
