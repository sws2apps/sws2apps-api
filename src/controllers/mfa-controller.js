import twofactor from 'node-2fa';
import * as OTPAuth from 'otpauth';
import { validationResult } from 'express-validator';
import { users } from '../classes/Users.js';

export const verifyToken = async (req, res, next) => {
	const isProd = process.env.NODE_ENV === 'production';

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

	const { token, trusted } = req.body;

	const { id, sessions, username, cong_name, cong_number, cong_role, cong_id, user_local_uid, user_members_delegate } =
		res.locals.currentUser;

	try {
		const user = users.findUserById(id);
		const secret = user.decryptSecret();

		//check secret version
		if (secret.version === 1) {
			// v1 2fa verification
			const verified = twofactor.verifyToken(secret.secret, token);

			if (verified?.delta === 0) {
				// upgrade token to v2
				const newSecret = await user.generateSecret();

				res.locals.type = 'warn';
				res.locals.message = 'user authentication rejected because account mfa needs an upgrade';
				res.status(403).json({
					secret: newSecret.secret,
					qrCode: newSecret.uri,
					version: newSecret.version,
				});

				return;
			}
		} else {
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

			if (delta === -1 || delta === 0 || delta === 1) {
				const { visitorid } = req.headers;

				let newSessions = sessions.map((session) => {
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

				res.locals.type = 'info';
				res.locals.message = 'OTP token verification success';

				res.status(200).json(obj);

				return;
			}
		}

		res.locals.type = 'warn';
		res.locals.message = 'OTP token invalid';

		res.status(403).json({ message: 'TOKEN_INVALID' });
	} catch (err) {
		next(err);
	}
};
