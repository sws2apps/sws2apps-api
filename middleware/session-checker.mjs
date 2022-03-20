// dependencies
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore();

export const sessionChecker = () => {
	return async (req, res, next) => {
		try {
			const validPaths = ['/login'];

			const cn_uid = req.headers.cn_uid;

			if (validPaths.findIndex((path) => path === req.path) === -1) {
				if (!cn_uid || cn_uid.length === 0) {
					res.locals.type = 'warn';
					res.locals.message = 'the connection identifier is missing';

					res.status(403).json({ message: 'LOGIN_FIRST' });

					return;
				}
			}

			// get user session
			const { email } = req.body;
			const userRef = db.collection('users').doc(email);
			const userSnap = await userRef.get();

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

			// check if session is valid
			const findCn = validSessions.find((session) => session.cn_uid === cn_uid);

			// pass about data to next route
			res.locals.userAbout = data.about;

			if (!findCn) {
				if (validPaths.findIndex((path) => path === req.path) >= 0) {
					next();
				} else {
					res.locals.type = 'warn';
					res.locals.message = 'the connection identifier is invalid';

					res.status(403).json({ message: 'LOGIN_FIRST' });
				}
			} else {
				const { mfaVerified } = findCn;
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
			}
		} catch (err) {
			next(err);
		}
	};
};
