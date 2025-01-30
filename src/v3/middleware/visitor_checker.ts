import { NextFunction, Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { UsersList } from '../classes/Users.js';
import { formatError } from '../utils/format_log.js';
import { decodeUserIdToken } from '../services/firebase/users.js';
import { authBearerCheck } from '../services/validator/auth.js';

export const visitorChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await check('Authorization').exists().notEmpty().isString().custom(authBearerCheck).run(req);

			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				const msg = formatError(errors);

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			// decode authorization
			const idToken = req.headers.authorization!.split('Bearer ')[1];
			const uid = await decodeUserIdToken(idToken);

			if (!uid) {
				res.locals.type = 'warn';
				res.locals.message = 'this user is not yet authenticated';
				res.status(403).json({ message: 'LOGIN_FIRST' });
				return;
			}

			// get visitorid signed
			const visitorid = req.signedCookies.visitorid;
			if (!visitorid) {
				res.locals.type = 'warn';
				res.locals.message = 'the device the user is using was revoked';
				res.status(403).json({ message: 'DEVICE_REVOKED' });
				return;
			}

			const user = UsersList.findByAuthUid(uid);

			if (!user) {
				res.locals.type = 'warn';
				res.locals.message = 'this user account no longer exists';
				res.status(403).json({ message: 'ACCOUNT_NOT_FOUND' });
				return;
			}

			// get user session
			const sessions = user.sessions;

			// find if visitor id has valid session
			const findSession = sessions!.find((session) => session.visitorid === visitorid);

			if (!findSession) {
				res.locals.type = 'warn';
				res.locals.message = 'the visitor id is invalid or does not have an active session';

				res.clearCookie('visitorid');
				res.status(403).json({ message: 'SESSION_REVOKED' });
				return;
			}

			// assign local vars for current user in next route
			res.locals.currentUser = user;

			if (user.profile.mfa_enabled) {
				const { mfaVerified } = findSession;

				if (mfaVerified) {
					// update last seen
					await user.updateSessionLastSeen(visitorid, req);
					next();
				} else {
					// allow verify token to pass this middleware
					if (req.path === '/verify-token') {
						next();
					} else {
						res.locals.type = 'warn';
						res.locals.message = 'two factor authentication required';
						res.status(401).json({ message: 'LOGIN_FIRST' });
					}
				}
			} else {
				// update last seen
				await user.updateSessionLastSeen(visitorid, req);
				next();
			}
		} catch (err) {
			next(err);
		}
	};
};

export const pocketVisitorChecker = () => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// get visitorid signed
			const visitorid = req.signedCookies.visitorid;
			if (!visitorid) {
				res.locals.type = 'warn';
				res.locals.message = 'the device the user is using was revoked';
				res.status(403).json({ message: 'DEVICE_REVOKED' });
				return;
			}

			const user = UsersList.findByVisitorId(visitorid);

			if (!user) {
				res.locals.type = 'warn';
				res.locals.message = 'this user account no longer exists';

				res.clearCookie('visitorid');
				res.status(403).json({ message: 'ACCOUNT_NOT_FOUND' });
				return;
			}

			// assign local vars for current user in next route
			res.locals.currentUser = user;

			await user.updateSessionLastSeen(visitorid, req);
			next();
		} catch (err) {
			next(err);
		}
	};
};
