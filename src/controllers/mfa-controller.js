import * as OTPAuth from 'otpauth';
import { validationResult } from 'express-validator';
import { users } from '../classes/Users.js';
import { congregations } from '../classes/Congregations.js';

export const verifyToken = async (req, res, next) => {
	const isProd = process.env.NODE_ENV === 'production';

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

	const { token, trusted } = req.body;

	const { id, sessions, username, cong_name, cong_number, cong_role, cong_id, user_local_uid, user_members_delegate } =
		res.locals.currentUser;

	try {
		const user = users.findUserById(id);
		const secret = user.decryptSecret();

		// v2 2fa verification

		const totp = new OTPAuth.TOTP({
			issuer: isProd ? 'sws2apps' : 'sws2apps-test',
			label: user.user_uid,
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			secret: OTPAuth.Secret.fromBase32(secret.secret),
		});

		// Validate a token.
		const delta = totp.validate({
			token: token,
			window: 1,
		});

		console.log(delta);

		if ((delta < -1 && delta > 1) || delta === null || !delta) {
			res.locals.type = 'warn';
			res.locals.message = 'OTP token invalid';
			res.status(403).json({ message: 'TOKEN_INVALID' });
			return;
		}

		const visitorid = isNaN(req.headers.visitorid) ? req.headers.visitorid : +req.headers.visitorid;

		const newSessions = sessions.map((session) => {
			if (session.visitorid === visitorid) {
				let sessionExpired = session.expires;
				if (trusted) {
					sessionExpired = new Date().getTime() + 30 * 24 * 60 * 60000; // expired after 30 days if trusted
				}
				return {
					...session,
					expires: sessionExpired,
					mfaVerified: true,
					sws_last_seen: new Date().getTime(),
				};
			} else {
				return session;
			}
		});

		await user.enableMFA();
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

		const userInfo = structuredClone(obj);

		const cong = congregations.findCongregationById(cong_id);
		if (cong) {
			const isPublisher = cong.isPublisher(user_local_uid);
			const isMS = cong.isMS(user_local_uid);
			const isElder = cong.isElder(user_local_uid);

			if (isElder) userInfo.cong_role.push('elder');
			if (isMS) userInfo.cong_role.push('ms');
			if (isPublisher) userInfo.cong_role.push('publisher');

			// retrieve congregation persons records if elder
			if (isElder) {
				const lmmoRole = cong_role.includes('lmmo') || cong_role.includes('lmmo-backup');
				const secretaryRole = cong_role.includes('secretary');

				// exclude lmmo and secretary
				if (!lmmoRole && !secretaryRole) {
					const backupData = cong.retrieveBackup();
					userInfo.cong_persons = backupData.cong_persons;
				}
			}

			// retrieve latest field service reports if publisher
			const publisherRole = isElder || isMS || isPublisher;
			if (publisherRole) {
				const backupData = user.retrieveBackup();
				userInfo.user_fieldServiceReports = backupData.user_fieldServiceReports;
			}
		}

		res.locals.type = 'info';
		res.locals.message = 'OTP token verification success';
		res.status(200).json(userInfo);
	} catch (err) {
		next(err);
	}
};
