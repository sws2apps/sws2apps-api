import { NextFunction, Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { UsersList } from '../classes/Users.js';
import { formatError } from '../utils/format_log.js';

export const visitorChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await check('visitorid').isString().notEmpty().run(req);
			await check('uid').isString().not().equals('undefined').isLength({ min: 8 }).run(req);

			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				const msg = formatError(errors);

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			const uid = req.headers.uid as string;
			console.log(uid);
			const visitorid = req.headers.visitorid as string;
			const user = UsersList.findByAuthUid(uid);

			if (!user) {
				res.locals.type = 'warn';
				res.locals.message = 'this user account no longer exists';

				res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
				return;
			}

			if (user.disabled) {
				res.locals.type = 'warn';
				res.locals.message = 'this user account is currently disabled';

				res.status(403).json({ message: 'ACCOUNT_DISABLED' });
				return;
			}

			// get user session
			const sessions = user.sessions;

			// find if visitor id has valid session
			const findSession = sessions!.find((session) => session.visitorid.toString() === visitorid.toString());

			if (!findSession) {
				res.locals.type = 'warn';
				res.locals.message = 'the visitor id is invalid or does not have an active session';
				res.status(403).json({ message: 'LOGIN_FIRST' });
				return;
			}

			// assign local vars for current user in next route
			res.locals.currentUser = user;

			if (user.mfaEnabled) {
				const { mfaVerified } = findSession;

				if (mfaVerified) {
					// update last seen
					await user.updateSessionLastSeen(visitorid);
					next();
				} else {
					// allow verify token to pass this middleware
					if (req.path === '/verify-token') {
						next();
					} else {
						res.locals.type = 'warn';
						res.locals.message = 'two factor authentication required';
						res.status(403).json({ message: 'LOGIN_FIRST' });
					}
				}
			} else {
				// update last seen
				await user.updateSessionLastSeen(visitorid);
				next();
			}
		} catch (err) {
			next(err);
		}
	};
};
