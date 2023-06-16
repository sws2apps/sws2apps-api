// import dependencies
import * as OTPAuth from 'otpauth';
import { getAuth } from 'firebase-admin/auth';
import { validationResult } from 'express-validator';
import { users } from '../classes/Users.js';
import { decryptData } from '../utils/encryption-utils.js';
import { retrieveVisitorDetails } from '../utils/auth-utils.js';

export const loginUser = async (req, res, next) => {
	try {
		const userIP = req.clientIp;
		const userAgent = req.headers['user-agent'];
		const isDev = process.env.NODE_ENV === 'development';

		// validate through express middleware
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const visitorid = +req.body.visitorid;
		const { uid } = req.headers;

		let authUser = users.findUserByAuthUid(uid);

		const expiryDate = new Date().getTime() + 24 * 60 * 60000; // expired after 1 day
		let newSessions = [];

		if (authUser) {
			await authUser.removeExpiredSession();
			newSessions = authUser.sessions.filter((session) => session.visitorid !== visitorid);
		}

		if (!authUser) {
			const userRecord = await getAuth().getUser(uid);
			const displayName = userRecord.displayName || userRecord.providerData[0].displayName;
			authUser = await users.create(displayName, uid);
		}

		newSessions.push({
			visitorid: visitorid,
			visitor_details: await retrieveVisitorDetails(userIP, userAgent),
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
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { email, uid } = req.body;
		const language = req.headers.applanguage || 'e';

		await users.createPasswordlessLink(email, uid, language, req.headers.origin);

		res.locals.type = 'info';
		res.locals.message = 'passwordless link will be sent to user';
		res.status(200).json({ message: 'SIGNIN_LINK_SEND' });
	} catch (err) {
		next(err);
	}
};

export const verifyPasswordlessInfo = async (req, res, next) => {
	const userIP = req.clientIp;
	const userAgent = req.headers['user-agent'];
	const isDev = process.env.NODE_ENV === 'development';

	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { email, visitorid, fullname } = req.body;
		const { uid } = req.headers;

		let authUser = users.findUserByAuthUid(uid);

		const expiryDate = new Date().getTime() + 24 * 60 * 60000; // expired after 1 day
		let newSessions = [];

		if (authUser) {
			await authUser.removeExpiredSession();
			newSessions = authUser.sessions.filter((session) => session.visitorid !== visitorid);
		}

		if (!authUser) {
			authUser = await users.createPasswordless(email, uid, fullname);
		}

		newSessions.push({
			visitorid: visitorid,
			visitor_details: await retrieveVisitorDetails(userIP, userAgent),
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
	} catch (err) {
		next(err);
	}
};

export const createUserTempOTPCode = async (req, res, next) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { uid } = req.headers;
		const language = req.headers.applanguage || 'e';
		const user = await users.findUserByAuthUid(uid);

		if (user) {
			await user.createTempOTPCode(language);

			res.locals.type = 'info';
			res.locals.message = `temporary code for signin has been queued for sending`;

			res.status(200).json({ message: 'CHECK_EMAIL' });
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = `user record could not be found`;
		res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
	} catch (err) {
		next(err);
	}
};

export const verifyUserTempOTPCode = async (req, res, next) => {
	try {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { uid, visitorid } = req.headers;
		const { code } = req.body;
		const user = await users.findUserByAuthUid(uid);

		if (!user) {
			res.locals.type = 'warn';
			res.locals.message = `user record could not be found`;
			res.status(404).json({ message: 'ACCOUNT_NOT_FOUND' });
			return;
		}

		const result = await user.verifyTempOTPCode(code);

		if (!result) {
			res.locals.type = 'warn';
			res.locals.message = 'Email OTP token invalid';
			res.status(403).json({ message: 'EMAIL_OTP_INVALID' });
			return;
		}

		const { id, sessions, username, cong_name, cong_number, cong_role, cong_id, user_local_uid, user_members_delegate } = user;

		let newSessions = sessions.map((session) => {
			if (session.visitorid === visitorid) {
				return {
					...session,
					mfaVerified: true,
					sws_last_seen: new Date().getTime(),
				};
			} else {
				return session;
			}
		});

		await user.updateSessions(newSessions);

		// init response object
		const obj = {
			message: 'TOKEN_VALID',
			id,
			username,
			cong_name,
			cong_number,
			cong_role,
			cong_id,
			global_role: user.global_role,
			user_local_uid,
			user_members_delegate,
		};

		res.locals.type = 'info';
		res.locals.message = 'OTP token verification success';
		res.status(200).json(obj);
	} catch (err) {
		next(err);
	}
};
