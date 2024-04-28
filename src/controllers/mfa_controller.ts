import { NextFunction, Request, Response } from 'express';
import * as OTPAuth from 'otpauth';
import { validationResult } from 'express-validator';
import { UsersList } from '../classes/Users.js';
import { CongregationsList } from '../classes/Congregations.js';

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
	const isProd = process.env.NODE_ENV === 'production';

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		let msg = '';
		errors.array().forEach((error) => {
			msg += `${msg === '' ? '' : ', '}: ${error.msg}`;
		});

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'Bad request: provided inputs are invalid.',
		});

		return;
	}

	const { token } = req.body;

	const { id, sessions, cong_name, cong_number, cong_role, cong_id, user_local_uid, firstname, lastname } =
		res.locals.currentUser;

	try {
		const user = UsersList.findById(id)!;
		const secret = user.decryptSecret();

		// v2 2fa verification

		const totp = new OTPAuth.TOTP({
			issuer: isProd ? 'Organized' : 'Organized-dev',
			label: user.user_email,
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			secret: OTPAuth.Secret.fromBase32(secret.secret),
		});

		// Validate a token.
		const delta = totp.validate({ token: token, window: 1 });

		if (delta === null || delta === undefined || (delta < -1 && delta > 1)) {
			res.locals.type = 'warn';
			res.locals.message = 'OTP token invalid';
			res.status(403).json({ message: 'TOKEN_INVALID' });
			return;
		}

		const visitorid = req.headers.visitorid as string;

		const newSessions = structuredClone(sessions!);
		const findSession = newSessions.find((session) => session.visitorid === visitorid)!;
		findSession.sws_last_seen = new Date().toISOString();
		findSession.mfaVerified = true;

		await user.enableMFA();
		await user.updateSessions(newSessions);

		// init response object
		const userInfo = {
			message: 'TOKEN_VALID',
			id,
			firstname,
			lastname,
			cong_name,
			cong_number,
			cong_role,
			country_code: '',
			cong_id,
			global_role: user.global_role,
			user_local_uid,
			cong_encryption: '',
		};

		const cong = CongregationsList.findById(cong_id!);
		if (cong) {
			userInfo.cong_encryption = cong.cong_encryption;
			userInfo.country_code = cong.country_code;
		}

		res.locals.type = 'info';
		res.locals.message = 'OTP token verification success';
		res.status(200).json(userInfo);
	} catch (err) {
		next(err);
	}
};
