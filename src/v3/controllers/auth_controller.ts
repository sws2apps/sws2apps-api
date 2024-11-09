import { NextFunction, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { validationResult } from 'express-validator';
import { generateTokenDev } from '../dev/setup.js';
import { UsersList } from '../classes/Users.js';
import { UserAuthResponse, UserSession } from '../definition/user.js';
import { retrieveVisitorDetails } from '../services/ip_details/auth_utils.js';
import { CongregationsList } from '../classes/Congregations.js';
import { formatError } from '../utils/format_log.js';
import { decodeUserIdToken } from '../services/firebase/users.js';
import { cookieOptions } from '../utils/app.js';
import { ROLE_MASTER_KEY } from '../constant/base.js';
import { MailClient } from '../config/mail_config.js';

const isDev = process.env.NODE_ENV === 'development';

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userIP = req.clientIp!;

		// validate through express middleware
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

		// decode authorization
		const idToken = req.headers.authorization!.split('Bearer ')[1];
		const uid = await decodeUserIdToken(idToken);

		if (!uid) {
			res.locals.type = 'warn';
			res.locals.message = 'the idToken received is invalid';
			res.status(404).json({ message: 'INVALID_BEARER' });
			return;
		}

		const visitorid: string = req.signedCookies.visitorid || crypto.randomUUID();
		let authUser = UsersList.findByAuthUid(uid);
		let newSessions: UserSession[] = [];

		if (authUser) {
			newSessions = authUser.sessions?.filter((record) => record.visitorid !== visitorid) || [];
		}

		if (!authUser) {
			const userRecord = await getAuth().getUser(uid);
			const displayName = userRecord.displayName || userRecord.providerData[0].displayName;
			let firstname = '';
			let lastname = '';

			if (displayName.length > 0) {
				const names = displayName.split(' ');
				lastname = names.pop()!;
				firstname = names.join(' ');
			}

			authUser = await UsersList.create({ auth_uid: uid, firstname, lastname });
		}

		const newSession: UserSession = {
			mfaVerified: false,
			last_seen: new Date().toISOString(),
			visitorid: visitorid,
			visitor_details: await retrieveVisitorDetails(userIP, req),
			identifier: crypto.randomUUID(),
		};

		newSessions.push(newSession);

		await authUser.updateSessions(newSessions);

		if (authUser.profile.mfa_enabled) {
			res.locals.type = 'info';
			res.locals.message = 'user required to verify mfa';

			res.cookie('visitorid', visitorid, cookieOptions(req));

			if (isDev) {
				const tokenDev = generateTokenDev(authUser.email!, authUser.profile.secret!);
				res.status(200).json({ message: 'MFA_VERIFY', code: tokenDev });
			} else {
				res.status(200).json({ message: 'MFA_VERIFY' });
			}

			return;
		}

		const userInfo: UserAuthResponse = {
			message: 'TOKEN_VALID',
			id: authUser.id,
			app_settings: {
				user_settings: {
					firstname: authUser.profile.firstname,
					lastname: authUser.profile.lastname,
					role: authUser.profile.role,
					mfa: 'not_enabled',
				},
			},
		};

		if (authUser.profile.congregation?.id) {
			const userCong = CongregationsList.findById(authUser.profile.congregation.id);

			if (userCong) {
				const userRole = authUser.profile.congregation.cong_role;
				const masterKeyNeeded = userRole.some((role) => ROLE_MASTER_KEY.includes(role));

				userInfo.app_settings.user_settings.user_local_uid = authUser.profile.congregation.user_local_uid;
				userInfo.app_settings.user_settings.user_members_delegate = authUser.profile.congregation.user_members_delegate;
				userInfo.app_settings.user_settings.cong_role = authUser.profile.congregation.cong_role;

				const midweek = userCong.settings.midweek_meeting.map((record) => {
					return { type: record.type, time: record.time, weekday: record.weekday };
				});

				const weekend = userCong.settings.weekend_meeting.map((record) => {
					return { type: record.type, time: record.time, weekday: record.weekday };
				});

				userInfo.app_settings.cong_settings = {
					id: authUser.profile.congregation.id,
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
		res.locals.message = 'user successfully logged in without MFA';

		res.cookie('visitorid', visitorid, cookieOptions(req));
		res.status(200).json(userInfo);
	} catch (err) {
		next(err);
	}
};

export const createSignInLink = async (req: Request, res: Response, next: NextFunction) => {
	try {
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

		const { email } = req.body;
		const language = (req.headers?.applanguage as string) || 'en';

		const link = await UsersList.generatePasswordLessLink({ email, origin: req.headers.origin! });

		const MAIL_ENABLED = process.env.MAIL_ENABLED === 'true';

		if (MAIL_ENABLED) {
			req.i18n.changeLanguage(language);

			const options = {
				to: email,
				subject: req.t('tr_login'),
				template: 'login',
				context: {
					loginTitle: req.t('tr_login'),
					loginDesc: req.t('tr_loginDesc'),
					link,
					loginButton: req.t('tr_loginBtn'),
					loginAltText: req.t('tr_loginAltText'),
					loginIgnoreText: req.t('tr_loginIgnoreText'),
					copyright: new Date().getFullYear(),
				},
			};

			MailClient.sendEmail(options, 'Passwordless link sent to user');
		}

		res.locals.type = 'info';
		res.locals.message = 'passwordless link will be sent to user';
		res.status(200).json(MAIL_ENABLED ? { message: 'SIGNIN_LINK_SEND' } : { link });
	} catch (err) {
		next(err);
	}
};

export const verifyPasswordlessInfo = async (req: Request, res: Response, next: NextFunction) => {
	const userIP = req.clientIp!;
	const isDev = process.env.NODE_ENV === 'development';

	try {
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

		// decode authorization
		const idToken = req.headers.authorization!.split('Bearer ')[1];
		const uid = await decodeUserIdToken(idToken);

		if (!uid) {
			res.locals.type = 'warn';
			res.locals.message = 'the idToken received is invalid';
			res.status(404).json({ message: 'INVALID_BEARER' });
			return;
		}

		const visitorid = req.signedCookies.visitorid || crypto.randomUUID();
		const email = req.body.email as string;

		let authUser = UsersList.findByAuthUid(uid);

		let newSessions: UserSession[] = [];

		if (authUser) {
			newSessions = authUser.sessions?.filter((session) => session.visitorid !== visitorid) || [];
		}

		if (!authUser) {
			authUser = await UsersList.create({ auth_uid: uid, firstname: '', lastname: '', email });
		}

		const newSession: UserSession = {
			mfaVerified: false,
			last_seen: new Date().toISOString(),
			visitorid: visitorid,
			visitor_details: await retrieveVisitorDetails(userIP, req),
			identifier: crypto.randomUUID(),
		};

		newSessions.push(newSession);

		await authUser.updateSessions(newSessions);

		if (authUser.profile.mfa_enabled) {
			res.locals.type = 'info';
			res.locals.message = 'user required to verify mfa';

			res.cookie('visitorid', visitorid, cookieOptions(req));
			if (isDev) {
				const tokenDev = generateTokenDev(authUser.email!, authUser.profile.secret!);
				res.status(200).json({ message: 'MFA_VERIFY', code: tokenDev });
			} else {
				res.status(200).json({ message: 'MFA_VERIFY' });
			}

			return;
		}

		const userInfo: UserAuthResponse = {
			message: 'TOKEN_VALID',
			id: authUser.id,
			app_settings: {
				user_settings: {
					firstname: authUser.profile.firstname,
					lastname: authUser.profile.lastname,
					role: authUser.profile.role,
					mfa: 'not_enabled',
				},
			},
		};

		if (authUser.profile.congregation?.id) {
			const userCong = CongregationsList.findById(authUser.profile.congregation.id);

			const userRole = authUser.profile.congregation.cong_role;
			const masterKeyNeeded = userRole.some((role) => ROLE_MASTER_KEY.includes(role));

			if (userCong) {
				userInfo.app_settings.user_settings.user_local_uid = authUser.profile.congregation.user_local_uid;
				userInfo.app_settings.user_settings.user_members_delegate = authUser.profile.congregation.user_members_delegate;
				userInfo.app_settings.user_settings.cong_role = authUser.profile.congregation.cong_role;

				const midweek = userCong.settings.midweek_meeting.map((record) => {
					return { type: record.type, time: record.time, weekday: record.weekday };
				});

				const weekend = userCong.settings.weekend_meeting.map((record) => {
					return { type: record.type, time: record.time, weekday: record.weekday };
				});

				userInfo.app_settings.cong_settings = {
					id: authUser.profile.congregation.id,
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
		res.locals.message = 'user successfully logged in without MFA';

		res.cookie('visitorid', visitorid, cookieOptions(req));
		res.status(200).json(userInfo);
	} catch (err) {
		next(err);
	}
};
