// import dependencies
import * as OTPAuth from 'otpauth';
import { getAuth } from 'firebase-admin/auth';
import { validationResult } from 'express-validator';
import { FingerprintJsServerApiClient, Region } from '@fingerprintjs/fingerprintjs-pro-server-api';
import { users } from '../classes/Users.js';
import { decryptData } from '../utils/encryption-utils.js';

export const loginUser = async (req, res, next) => {
	try {
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

		const { visitorid } = req.body;
		const { uid } = req.headers;

		// validate visitor id
		const client = new FingerprintJsServerApiClient({
			region: Region.Global,
			apiKey: process.env.FINGERPRINT_API_SERVER_KEY,
		});

		const visitorHistory = await client.getVisitorHistory(visitorid, {
			limit: 1,
		});

		if (visitorHistory.visits?.length > 0) {
			let authUser = users.findUserByAuthUid(uid);

			const expiryDate = new Date().getTime() + 24 * 60 * 60000; // expired after 1 day
			let newSessions = [];

			if (authUser) {
				await authUser.removeExpiredSession();
				newSessions = authUser.sessions.filter((session) => session.visitorid !== visitorid);
			}

			if (!authUser) {
				const userRecord = await getAuth().getUser(uid);
				authUser = await users.create(userRecord.displayName, userRecord.email);
			}

			newSessions.push({
				visitorid: visitorid,
				visitor_details: { ...visitorHistory.visits[0] },
				expires: expiryDate,
				mfaVerified: false,
			});
			await authUser.updateSessions(newSessions);

			const generateTokenDev = () => {
				const { secret } = JSON.parse(decryptData(authUser.secret));
				const totp = new OTPAuth.TOTP({
					issuer: 'sws2apps-test',
					label: authUser.user_uid,
					algorithm: 'SHA1',
					digits: 6,
					period: 30,
					secret: OTPAuth.Secret.fromBase32(secret),
				});

				return totp.generate();
			};

			if (authUser.mfaEnabled) {
				res.locals.type = 'info';
				res.locals.message = 'user required to verify mfa';

				if (isDev) {
					console.log(`Please use this OTP code to complete your login: ${generateTokenDev()}`);
				}

				res.status(200).json({ message: 'MFA_VERIFY' });
			} else {
				const secret = await authUser.generateSecret();

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
			res.locals.failedLoginAttempt = true;
			res.locals.type = 'warn';
			res.locals.message = 'the authentication request seems to be fraudulent';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		}
	} catch (err) {
		next(err);
	}
};

export const createSignInLink = async (req, res, next) => {
	try {
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

		const { email } = req.body;
		const language = req.headers.applanguage || 'e';

		await users.createPasswordlessLink(email, language, req.headers.origin);

		res.locals.type = 'info';
		res.locals.message = 'passwordless link will be sent to user';
		res.status(200).json({ message: 'SIGNIN_LINK_SEND' });
	} catch (err) {
		next(err);
	}
};

export const updatePasswordlessInfo = async (req, res, next) => {
	const isDev = process.env.NODE_ENV === 'development';

	try {
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

		const { email, fullname, visitorid } = req.body;
		const { uid } = req.headers;

		// validate visitor id
		const client = new FingerprintJsServerApiClient({
			region: Region.Global,
			apiKey: process.env.FINGERPRINT_API_SERVER_KEY,
		});

		const visitorHistory = await client.getVisitorHistory(visitorid, {
			limit: 1,
		});

		if (visitorHistory.visits?.length > 0) {
			let authUser = users.findUserByAuthUid(uid);

			const expiryDate = new Date().getTime() + 24 * 60 * 60000; // expired after 1 day
			let newSessions = [];

			if (authUser) {
				await authUser.removeExpiredSession();
				newSessions = authUser.sessions.filter((session) => session.visitorid !== visitorid);
			}

			if (!authUser) {
				authUser = await users.createPasswordless(fullname, email, uid);
			}

			newSessions.push({
				visitorid: visitorid,
				visitor_details: { ...visitorHistory.visits[0] },
				expires: expiryDate,
				mfaVerified: false,
			});
			await authUser.updateSessions(newSessions);

			const generateTokenDev = () => {
				const { secret } = JSON.parse(decryptData(authUser.secret));
				const totp = new OTPAuth.TOTP({
					issuer: 'sws2apps-test',
					label: authUser.user_uid,
					algorithm: 'SHA1',
					digits: 6,
					period: 30,
					secret: OTPAuth.Secret.fromBase32(secret),
				});

				return totp.generate();
			};

			if (authUser.mfaEnabled) {
				res.locals.type = 'info';
				res.locals.message = 'user required to verify mfa';

				if (isDev) {
					console.log(`Please use this OTP code to complete your login: ${generateTokenDev()}`);
				}

				res.status(200).json({ message: 'MFA_VERIFY' });
			} else {
				const secret = await authUser.generateSecret();

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
			res.locals.failedLoginAttempt = true;
			res.locals.type = 'warn';
			res.locals.message = 'the authentication request seems to be fraudulent';
			res.status(403).json({ message: 'UNAUTHORIZED_REQUEST' });
		}
	} catch (err) {
		next(err);
	}
};
