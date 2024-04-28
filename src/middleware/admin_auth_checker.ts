import { NextFunction, Request, Response } from 'express';

export const adminAuthChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// check if session is authenticated for an administrator
			const { global_role } = res.locals.currentUser;
			if (global_role === 'admin') {
				next();
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'you are not an administrator';
				res.locals.failedLoginAttempt = true;
				res.status(403).json({ message: 'UNAUTHORIZED_ACCESS' });
			}
		} catch (err) {
			next(err);
		}
	};
};
