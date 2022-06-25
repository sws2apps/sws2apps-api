// dependencies
import { check, validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';

import { cleanExpiredSession, getUserInfo } from '../utils/user-utils.js';

// get firestore
const db = getFirestore();

export const visitorChecker = () => {
	return async (req, res, next) => {
		try {
			await check('visitor_id').notEmpty().run(req);
			await check('email').isEmail().run(req);

			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				let msg = '';
				errors.array().forEach((error) => {
					msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
				});

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({ message: 'INPUT_INVALID' });

				return;
			}

			const { email, visitor_id } = req.headers;
			const user = await getUserInfo(email);

			if (user) {
				const { id, disabled } = user;

				// remove expired sessions
				await cleanExpiredSession(id);

				if (disabled) {
					res.locals.type = 'warn';
					res.locals.message = 'this user account is currently disabled';

					res.status(403).json({ message: 'ACCOUNT_DISABLED' });
				} else {
					// get user session
					const userDoc = db.collection('users').doc(id);
					const userSnap = await userDoc.get();

					let sessions = userSnap.data().about.sessions || [];

					// find if visitor id has valid session
					const findSession = sessions.find(
						(session) => session.visitor_id === visitor_id
					);

					if (findSession) {
						// assign local vars for current user in next route
						res.locals.currentUser = user;

						const { mfaVerified } = findSession;
						if (mfaVerified) {
							// update last seen

							let newSessions = sessions.map((session) => {
								if (session.visitor_id === visitor_id) {
									return { ...session, sws_last_seen: new Date().getTime() };
								} else {
									return session;
								}
							});

							await db
								.collection('users')
								.doc(id)
								.update({ 'about.sessions': newSessions });

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
						res.locals.type = 'warn';
						res.locals.message =
							'the visitor id is invalid or does not have an active session';

						res.status(403).json({ message: 'LOGIN_FIRST' });
					}
				}
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'this user account no longer exists';

				res.status(403).json({ message: 'ACCOUNT_NOT_FOUND' });
			}
		} catch (err) {
			next(err);
		}
	};
};
