import { Request, Response } from 'express';
import * as OTPAuth from 'otpauth';
import { validationResult } from 'express-validator';
import { UsersList } from '../classes/Users.js';
import { CongregationsList } from '../classes/Congregations.js';
import { formatError } from '../utils/format_log.js';
import { UserAuthResponse } from '../definition/user.js';
import { ROLE_MASTER_KEY } from '../constant/base.js';

export const verifyToken = async (req: Request, res: Response) => {
	const isProd = process.env.NODE_ENV === 'production';

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { token } = req.body;

	const { id, sessions } = res.locals.currentUser;

	const user = UsersList.findById(id)!;
	const secret = user.decryptSecret();

	// v2 2fa verification

	const totp = new OTPAuth.TOTP({
		issuer: isProd ? 'Organized' : 'Organized-dev',
		label: user.email,
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

	const visitorid = req.signedCookies.visitorid;

	const newSessions = structuredClone(sessions);
	const findSession = newSessions.find((session) => session.visitorid === visitorid)!;
	findSession.last_seen = new Date().toISOString();
	findSession.mfaVerified = true;

	await user.enableMFA();
	await user.updateSessions(newSessions);

	const userInfo: UserAuthResponse = {
		message: 'TOKEN_VALID',
		id: user.id,
		app_settings: {
			user_settings: {
				firstname: user.profile.firstname,
				lastname: user.profile.lastname,
				role: user.profile.role,
				mfa: 'enabled',
			},
		},
	};

	if (user.profile.congregation?.id) {
		const userCong = CongregationsList.findById(user.profile.congregation.id);

		const userRole = user.profile.congregation.cong_role;
		const masterKeyNeeded = userRole.some((role) => ROLE_MASTER_KEY.includes(role));

		if (userCong) {
			userInfo.app_settings.user_settings.user_local_uid = user.profile.congregation.user_local_uid;
			userInfo.app_settings.user_settings.user_members_delegate = user.profile.congregation.user_members_delegate;
			userInfo.app_settings.user_settings.cong_role = user.profile.congregation.cong_role;

			const midweek = userCong.settings.midweek_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday };
			});

			const weekend = userCong.settings.weekend_meeting.map((record) => {
				return { type: record.type, time: record.time, weekday: record.weekday };
			});

			userInfo.app_settings.cong_settings = {
				id: user.profile.congregation.id,
				cong_circuit: userCong.settings.cong_circuit,
				cong_name: userCong.settings.cong_name,
				cong_number: userCong.settings.cong_number,
				country_code: userCong.settings.country_code,
				cong_access_code: userCong.settings.cong_access_code,
				cong_master_key: masterKeyNeeded ? userCong.settings.cong_master_key : undefined,
				cong_location: userCong.settings.cong_location,
				midweek_meeting: midweek,
				weekend_meeting: weekend,
			};
		}
	}

	res.locals.type = 'info';
	res.locals.message = 'OTP token verification success';
	res.status(200).json(userInfo);
};
