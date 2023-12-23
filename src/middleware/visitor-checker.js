import { check, validationResult } from 'express-validator';
import { users } from '../classes/Users.js';

export const visitorChecker = () => {
	return async (req, res, next) => {
		try {
			await check('visitorid').isString().notEmpty().run(req);
			await check('uid').isString().notEmpty().run(req);

			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				let msg = '';
				errors.array().forEach((error) => {
					msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
				});

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			const { uid } = req.headers;
			const visitorid = isNaN(req.headers.visitorid) ? req.headers.visitorid : +req.headers.visitorid;
			const user = users.findUserByAuthUid(uid);

			if (user) {
				const { disabled } = user;

				if (disabled) {
					res.locals.type = 'warn';
					res.locals.message = 'this user account is currently disabled';

					res.status(403).json({ message: 'ACCOUNT_DISABLED' });
				} else {
					// get user session
					let sessions = user.sessions;

					// find if visitor id has valid session
					const findSession = sessions.find((session) => session.visitorid.toString() === visitorid.toString());

					if (findSession) {
						// assign local vars for current user in next route
						res.locals.currentUser = user;

						if (user.mfaEnabled) {
							const { mfaVerified } = findSession;
							if (mfaVerified) {
								// update last seen
								await user.updateSessionsInfo(visitorid);
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
							await user.updateSessionsInfo(visitorid);
							next();
						}
					} else {
						res.locals.type = 'warn';
						res.locals.message = 'the visitor id is invalid or does not have an active session';

						res.status(403).json({ message: 'LOGIN_FIRST' });
					}
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'this user account no longer exists';

				res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
			}
		} catch (err) {
			next(err);
		}
	};
};
