import { NextFunction, Request, Response } from 'express';
import * as OTPAuth from 'otpauth';
import { validationResult } from 'express-validator';
import { UsersList } from '../classes/Users.js';
import { CongregationsList } from '../classes/Congregations.js';
import { formatError } from '../utils/format_log.js';
import { UserAuthResponse } from '../definition/user.js';

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
	const isProd = process.env.NODE_ENV === 'production';

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'Bad request: provided inputs are invalid.',
		});

		return;
	}

	const { token } = req.body;

	const { id, sessions } = res.locals.currentUser;

	try {
		const user = UsersList.findById(id)!;
		const secret = user.decryptSecret();

		// v2 2fa verification

		const totp = new OTPAuth.TOTP({
			issuer: isProd ? 'Organized' : 'Organized-dev',
			label: user.profile.email,
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

		const newSessions = structuredClone(sessions);
		const findSession = newSessions.find((session) => session.visitorid === visitorid)!;
		findSession.last_seen = new Date().toISOString();
		findSession.mfaVerified = true;

		await user.enableMFA();
		await user.updateSessions(newSessions);

		const userInfo: UserAuthResponse = {
			message: 'TOKEN_VALID',
			id: user.id,
			firstname: user.profile.firstname,
			lastname: user.profile.lastname,
			global_role: user.profile.role,
			mfa: 'not_enabled',
		};

		if (user.profile.congregation?.id) {
			const userCong = CongregationsList.findById(user.profile.congregation.id);
			if (userCong) {
				userInfo.cong_id = user.profile.congregation.id;
				userInfo.country_code = userCong.settings.country_code;
				userInfo.cong_name = userCong.settings.cong_name;
				userInfo.cong_number = userCong.settings.cong_number;
				userInfo.cong_role = user.profile.congregation.cong_role;
				userInfo.user_local_uid = user.profile.congregation.user_local_uid;
				userInfo.cong_master_key = userCong.settings.cong_master_key;
				userInfo.cong_access_code = userCong.settings.cong_access_code;
			}
		}

		res.locals.type = 'info';
		res.locals.message = 'OTP token verification success';
		res.status(200).json(userInfo);
	} catch (err) {
		next(err);
	}
};
