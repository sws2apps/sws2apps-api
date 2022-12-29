// import dependencies
import fetch from 'node-fetch';
import * as OTPAuth from 'otpauth';
import { validationResult } from 'express-validator';
import { FingerprintJsServerApiClient, Region } from '@fingerprintjs/fingerprintjs-pro-server-api';
import { users } from '../classes/Users.js';
import { decryptData } from '../utils/encryption-utils.js';

export const loginUser = async (req, res, next) => {
	try {
		const isProd = process.env.NODE_ENV === 'production';
		const isDev = process.env.NODE_ENV === 'development';

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

		const { email, password, visitorid } = req.body;

		// validate visitor id
		const client = new FingerprintJsServerApiClient({
			region: Region.Global,
			apiKey: process.env.FINGERPRINT_API_SERVER_KEY,
		});

		const visitorHistory = await client.getVisitorHistory(visitorid, {
			limit: 1,
		});

		if (visitorHistory.visits?.length > 0) {
			// pass to google toolkit for authentication

			let googleKit;
			if (isProd) {
				googleKit = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;
			} else {
				googleKit = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=0`;
			}

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
				const user = users.findUserByEmail(email);
				if (user) {
					await user.loadDetails();
					if (user.id) await user.removeExpiredSession();

					if (user.emailVerified) {
						// revoke matched session
						let newSessions = user.sessions.filter((session) => session.visitorid !== visitorid);

						const expiryDate = new Date().getTime() + 24 * 60 * 60000; // expired after 1 day

						newSessions.push({
							visitorid: visitorid,
							visitor_details: { ...visitorHistory.visits[0] },
							expires: expiryDate,
							mfaVerified: false,
						});

						await user.updateSessions(newSessions);

						const generateTokenDev = () => {
							const { secret } = JSON.parse(decryptData(user.secret));
							const totp = new OTPAuth.TOTP({
								issuer: 'sws2apps-test',
								label: email,
								algorithm: 'SHA1',
								digits: 6,
								period: 30,
								secret: OTPAuth.Secret.fromBase32(secret),
							});

							return totp.generate();
						};

						if (user.mfaEnabled) {
							res.locals.type = 'info';
							res.locals.message = 'user required to verify mfa';

							if (isDev) {
								console.log(`Please use this OTP code to complete your login: ${generateTokenDev()}`);
							}

							res.status(200).json({ message: 'MFA_VERIFY' });
						} else {
							const secret = await user.generateSecret();

							res.locals.type = 'warn';
							res.locals.message = 'user authentication rejected because account mfa is not yet setup';

							if (isDev) {
								console.log(`Please use this OTP code to complete your login: ${generateTokenDev()}`);
							}

							res.status(403).json({
								secret: secret.secret,
								qrCode: secret.uri,
								version: secret.version,
							});
						}
					} else {
						res.locals.type = 'warn';
						res.locals.message = 'user authentication rejected because account not yet verified';
						res.status(403).json({ message: 'NOT_VERIFIED' });
					}

					return;
				}

				res.locals.type = 'warn';
				res.locals.message = 'user authentication rejected because account could not be found anymore';
				res.status(400).json({ message: 'ACCOUNT_NOT_FOUND' });
			}
		} else {
			res.locals.failedLoginAttempt = true;
			res.locals.type = 'warn';
			res.locals.message = 'the authentication request seems to be fraudulent';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		}
	} catch (err) {
		next(err);
	}
};
