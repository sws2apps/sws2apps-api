// import dependencies
import Cryptr from 'cryptr';
import fetch from 'node-fetch';
import twofactor from 'node-2fa';
import { validationResult } from 'express-validator';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
	FingerprintJsServerApiClient,
	Region,
} from '@fingerprintjs/fingerprintjs-pro-server-api';
import { cleanExpiredSession, getUserInfo } from '../utils/user-utils.js';

// get firestore
const db = getFirestore(); //get default database

export const loginUser = async (req, res, next) => {
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

		const { email, password, visitor_id } = req.body;

		// validate visitor id
		const client = new FingerprintJsServerApiClient({
			region: Region.Global,
			apiKey: process.env.FINGERPRINT_API_SERVER_KEY,
		});

		const visitorHistory = await client.getVisitorHistory(visitor_id, {
			limit: 1,
		});

		if (visitorHistory.visits.length === 0) {
			res.locals.failedLoginAttempt = true;
			res.locals.type = 'warn';
			res.locals.message = 'the authentication request seems to be fraudulent';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		} else {
			// pass to google toolkit for authentication
			const googleKit = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;

			const response = await fetch(googleKit, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: email,
					password: password,
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
				// clean expired session
				const { id } = await getUserInfo(email);
				if (id) await cleanExpiredSession(id);

				// get user info from firebase auth
				const uid = data.localId;
				const userRecord = await getAuth().getUser(uid);

				if (userRecord.emailVerified) {
					// get user info from firestore
					const userRef = db.collection('users').doc(id);
					const userSnap = await userRef.get();

					const aboutUser = userSnap.data().about;

					let sessions = aboutUser.sessions || [];

					// revoke matched session
					let newSessions = sessions.filter(
						(session) => session.visitor_id !== visitor_id
					);

					const now = new Date();
					const expiryDate = now.getTime() + 24 * 60 * 60000; // expired after 1 day

					newSessions.push({
						visitor_id: visitor_id,
						visitor_details: { ...visitorHistory.visits[0] },
						expires: expiryDate,
						mfaVerified: false,
					});

					const data = {
						about: { ...aboutUser, sessions: newSessions },
					};

					await db.collection('users').doc(id).set(data, { merge: true });

					if (aboutUser.mfaEnabled) {
						res.locals.type = 'info';
						res.locals.message = 'user required to verify mfa';

						res.status(200).json({ message: 'MFA_VERIFY' });
					} else {
						// generate new secret and encrypt
						const secret = twofactor.generateSecret({
							name: 'sws2apps',
							account: email,
						});

						const myKey = '&sws2apps_' + process.env.SEC_ENCRYPT_KEY;
						const cryptr = new Cryptr(myKey);
						const encryptedData = cryptr.encrypt(JSON.stringify(secret));

						// save secret
						const firstData = {
							about: {
								...data.about,
								secret: encryptedData,
							},
						};

						await db
							.collection('users')
							.doc(id)
							.set(firstData, { merge: true });

						res.locals.type = 'warn';
						res.locals.message =
							'user authentication rejected because account mfa is not yet setup';
						res.status(403).json({
							secret: secret.secret,
							qrCode: secret.uri,
						});
					}
				} else {
					res.locals.type = 'warn';
					res.locals.message =
						'user authentication rejected because account not yet verified';
					res.status(403).json({ message: 'NOT_VERIFIED' });
				}
			}
		}
	} catch (err) {
		next(err);
	}
};
