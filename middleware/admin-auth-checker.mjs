import crypto from 'crypto';
import Cryptr from 'cryptr';
import fetch from 'node-fetch';
import { getFirestore } from 'firebase-admin/firestore';

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
								const { role, mfaEnabled } = userSnap.data().about;
								if (role === 'admin' && mfaEnabled) {
									next();
								} else if (role === 'admin' && !mfaEnabled) {
									// get user record
									const encryptedData = userSnap.data().about.secret;

									// retrieve secret
									const myKey = '&sws2apps_' + process.env.SEC_ENCRYPT_KEY;
									const cryptr = new Cryptr(myKey);
									const decryptedData = cryptr.decrypt(encryptedData);

									// get secret and uri
									const { secret, uri: qrCode } = JSON.parse(decryptedData);

									// create identifier
									const cn_uid = crypto.randomUUID();

									// save new session
									let sessions = userSnap.data().about.sessions || [];

									const now = new Date();
									const expiryDate = now.getTime() + 24 * 60 * 60000; // expired after 1 day
									sessions.push({
										cn_uid: cn_uid,
										expires: expiryDate,
										mfaVerified: false,
									});

									const data = {
										about: { ...userSnap.data().about, sessions: sessions },
									};

									await db
										.collection('users')
										.doc(email)
										.set(data, { merge: true });

									res.locals.type = 'warn';
									res.locals.message =
										'two-factor auth not setup yet for admin';
									res
										.status(403)
										.json({ cn_uid: cn_uid, secret: secret, qrCode: qrCode });
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
