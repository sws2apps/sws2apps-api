// dependencies
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore();

export const sessionChecker = () => {
	return async (req, res, next) => {
		try {
			const session_id = req.headers.session_id;

			if (!session_id || session_id.length === 0) {
				res.locals.type = 'warn';
				res.locals.message =
					'the session id is missing from the request headers';

				res.status(403).json({ message: 'LOGIN_FIRST' });

				return;
			}

			// get all active sessions
			const userRef = db.collection('users');
			const snapshot = await userRef.get();

			let allSessions = [];

			snapshot.forEach((doc) => {
				const userSessions = doc.data().about.sessions || [];
				for (let i = 0; i < userSessions.length; i++) {
					let obj = {
						email: doc.id,
						role: doc.data().about.role,
						...userSessions[i],
					};
					allSessions.push(obj);
				}
			});

			// find session id
			const findSession = allSessions.find(
				(session) => session.id === session_id
			);

			// check if session is valid
			if (findSession) {
				// get user session
				const { email } = findSession;
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

				// assign local vars for current user in next route
				const currentUser = {
					email: email,
					...userSnap.data(),
				};
				res.locals.currentUser = currentUser;

				// check if session is valid
				const findCn = validSessions.find(
					(session) => session.id === session_id && session.ip === req.clientIp
				);

				if (!findCn) {
					res.locals.type = 'warn';
					res.locals.message =
						'the session id is invalid, or the user is not allowed to use this session id';

					res.status(403).json({ message: 'LOGIN_FIRST' });
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
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'the session id is invalid';

				res.status(403).json({ message: 'LOGIN_FIRST' });
			}
		} catch (err) {
			next(err);
		}
	};
};
