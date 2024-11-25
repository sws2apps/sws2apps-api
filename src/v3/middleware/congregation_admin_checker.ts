import { NextFunction, Request, Response } from 'express';

export const congregationAdminChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// check if session is authenticated for congregation administrator
			const { profile } = res.locals.currentUser;

			const isAdmin =
				profile.congregation?.cong_role.some((role) => role === 'admin' || role === 'coordinator' || role === 'secretary') ??
				false;

			if (isAdmin) {
				next();
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'user do not have the appropriate role';
				res.locals.failedLoginAttempt = true;
				res.status(403).json({ message: 'UNAUTHORIZED_ACCESS' });
			}
		} catch (err) {
			next(err);
		}
	};
};
