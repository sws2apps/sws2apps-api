// dependencies
import { check, validationResult } from 'express-validator';
import { getFirestore } from 'firebase-admin/firestore';

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

			// get all users active sessions
			const userDoc = db.collection('users').doc(email);
			const userSnap = await userDoc.get();

			// remove expired sessions
			let sessions = userSnap.data().about.sessions || [];
			const currentDate = new Date().getTime();
			let validSessions = sessions.filter(
				(session) => session.expires > currentDate
			);
			const data = {
				about: { ...userSnap.data().about, sessions: validSessions },
			};
			await db.collection('users').doc(email).set(data, { merge: true });

			// find if visitor id has valid session
			const findSession = validSessions.find(
				(session) => session.visitor_id === visitor_id
			);

			if (findSession) {
				// assign local vars for current user in next route
				const currentUser = {
					...userSnap.data(),
				};
				res.locals.currentUser = currentUser;

				const { mfaVerified } = findSession;
				if (mfaVerified) {
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
		} catch (err) {
			next(err);
		}
	};
};
