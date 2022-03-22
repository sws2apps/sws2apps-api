// import dependencies
import crypto from 'crypto';
import express from 'express';
import fetch from 'node-fetch';
import { body, validationResult } from 'express-validator';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore(); //get default database

const router = express.Router();

router.post(
	'/user-login',
	body('email').isEmail(),
	body('password').isLength({ min: 6 }),
	async (req, res, next) => {
		try {
			// validate through express middleware
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				let msg = '';
				errors.array().forEach((error) => {
					msg += `${msg === '' ? '' : ', '}${error.param}: ${error.msg}`;
				});

				res.locals.type = 'warn';
				res.locals.message = `invalid input: ${msg}`;

				res.status(400).json({
					message: 'Bad request: provided inputs are invalid.',
				});

				return;
			}

			// pass to google toolkit for authentication
			const googleKit = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;

			const response = await fetch(googleKit, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...req.body,
				}),
			});

			// get response from google toolkit
			const data = await response.json();

			// check for built-in errors from google
			if (data.error) {
				res.locals.failedLoginAttempt = true;
				res.locals.type = 'warn';
				res.locals.message = `user failed to login: ${data.error.message}`;
				res.status(data.error.code).json({ message: data.error.message });
			} else {
				// get user info from firebase auth
				const uid = data.localId;
				const userRecord = await getAuth().getUser(uid);

				if (userRecord.emailVerified) {
					// get user info from firestore
					const userRef = db.collection('users').doc(userRecord.email);
					const userSnap = await userRef.get();

					const aboutUser = userSnap.data().about;

					if (aboutUser.mfaEnabled) {
						// create and save session
						const session_id = crypto.randomUUID();

						let sessions = [];
						const now = new Date();
						const expiryDate = now.getTime() + 24 * 60 * 60000; // expired after 1 day
						sessions.push({
							id: session_id,
							expires: expiryDate,
							mfaVerified: false,
							ip: req.clientIp,
						});

						const data = {
							about: { ...aboutUser, sessions: sessions },
						};

						await db
							.collection('users')
							.doc(userRecord.email)
							.set(data, { merge: true });

						res.locals.type = 'info';
						res.locals.message = 'user required to verify mfa';

						res.status(200).json({ session_id: session_id });
					} else {
						res.locals.type = 'warn';
						res.locals.message =
							'user authentication rejected because account mfa is not yet setup';
						res.status(403).json({ message: 'MFA_REQUIRED' });
					}
				} else {
					res.locals.type = 'warn';
					res.locals.message =
						'user authentication rejected because account not yet verified';
					res.status(403).json({ message: 'NOT_VERIFIED' });
				}
			}
		} catch (err) {
			next(err);
		}
	}
);

export default router;
