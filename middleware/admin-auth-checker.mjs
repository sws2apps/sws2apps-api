import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';

// get firestore
const db = getFirestore();

export const adminAuthChecker = () => {
	return async (req, res, next) => {
		try {
			const googleKit = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;

			fetch(googleKit, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...req.body,
				}),
			})
				.then(async (response) => {
					const data = await response.json();
					if (data.error) {
						res.locals.failedLoginAttempt = true;
						res.locals.type = 'warn';
						res.locals.message = `user failed to login: ${data.error.message}`;
						res.status(data.error.code).json({ message: data.error.message });
					} else {
						const validPaths = ['/login'];

						if (validPaths.findIndex((path) => path === req.path) >= 0) {
							const email = req.body.email;

							const userRef = db.collection('users').doc(email);
							const userSnap = await userRef.get();

							if (userSnap.exists) {
								const role = userSnap.data().about.role;
								if (role === 'admin') {
									next();
								} else {
									res.locals.type = 'warn';
									res.locals.message = 'you are not an administrator';
									res.locals.failedLoginAttempt = true;
									res.status(403).json({ message: 'UNAUTHORIZED_ACCESS' });
								}
							} else {
								res.locals.type = 'warn';
								res.locals.message = 'failed to fetch the requested users';
								res.status(403).json({ message: 'NOT_FOUND_2' });
							}
						} else {
							next();
						}
					}
				})
				.catch((err) => {
					next(err);
				});
		} catch (err) {
			next(err);
		}
	};
};
