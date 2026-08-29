import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { generateDevelopmentMfaToken } from '../mfa/development-token.js';
import { UsersList } from '../users/users.js';
import type {
	UserAuthResponse,
	UserSession,
} from '../users/user.types.js';
import { retrieveVisitorDetails } from '../../platform/visitor-details/visitor-details.js';
import { CongregationsList } from '../congregations/congregations.js';
import { formatError } from '../../http/validation-errors.js';
import { getSessionCookieOptions } from '../../http/security/session-cookie-options.js';
import { ROLE_MASTER_KEY } from '../../domain/users/master-key-roles.js';
import {
	createAuthenticationToken,
	getAuthenticationUserDisplayName,
	verifyAuthenticationToken,
} from './auth.service.js';
import { env } from '../../config/env.js';
import { isEmailOneTimePasswordValid } from './email-otp.js';
import {
	isPasswordlessEmailEnabled,
	sendPasswordlessLoginEmail,
} from './auth-notifications.service.js';

const isDev = env.isDevelopment;

export const loginUser = async (req: Request, res: Response) => {
	const userIP = req.clientIp!;

	// validate through express middleware
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	// decode authorization
	const idToken = req.headers.authorization!.split('Bearer ')[1];
	const uid = await verifyAuthenticationToken(idToken);

	if (!uid) {
		res.locals.type = 'warn';
		res.locals.message = 'the idToken received is invalid';
		res.status(404).json({ message: 'error_auth_invalid-token' });
		return;
	}

	const visitorid: string = req.signedCookies.visitorid || crypto.randomUUID();
	let authUser = UsersList.findByAuthUid(uid);
	let newSessions: UserSession[] = [];

	if (authUser) {
		newSessions = authUser.sessions?.filter((record) => record.visitorid !== visitorid) || [];
	}

	if (!authUser) {
		const displayName = await getAuthenticationUserDisplayName(uid);
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

		res.cookie('visitorid', visitorid, getSessionCookieOptions(req));

		if (isDev) {
			const tokenDev = generateDevelopmentMfaToken(
				authUser.email!,
				authUser.profile.secret!,
			);
			console.log('Use this code to login:', tokenDev);

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
				cong_prefix: userCong.settings.cong_prefix,
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

	res.cookie('visitorid', visitorid, getSessionCookieOptions(req));
	res.status(200).json(userInfo);
};

export const createSignInLink = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { email } = req.body;
	const language = (req.headers?.applanguage as string) || 'eng';

	const { link, otp } = await UsersList.generatePasswordLessLink({ email, origin: req.headers.origin! });

	const mailEnabled = isPasswordlessEmailEnabled();

	if (mailEnabled) {
		req.i18n.changeLanguage(language);

		sendPasswordlessLoginEmail({
			recipient: email,
			subject: req.t('tr_login'),
			title: req.t('tr_login'),
			description: req.t('tr_loginDesc'),
			loginLink: link,
			oneTimePassword: otp,
			loginButtonLabel: req.t('tr_loginBtn'),
			alternativeLinkText: req.t('tr_loginAltText'),
			ignoreRequestText: req.t('tr_loginIgnoreText'),
			oneTimePasswordLabel: req.t('tr_loginOTP'),
			oneTimePasswordDurationText: req.t('tr_loginOTPDuration'),
		});
	}

	res.locals.type = 'info';
	res.locals.message = 'passwordless link will be sent to user';
	res.status(200).json(mailEnabled ? { message: 'SIGNIN_LINK_SEND' } : { link, otp });
};

export const verifyPasswordlessInfo = async (req: Request, res: Response) => {
	const userIP = req.clientIp!;
	const isDev = env.isDevelopment;

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	// decode authorization
	const idToken = req.headers.authorization!.split('Bearer ')[1];
	const uid = await verifyAuthenticationToken(idToken);

	if (!uid) {
		res.locals.type = 'warn';
		res.locals.message = 'the idToken received is invalid';
		res.status(404).json({ message: 'error_auth_invalid-token' });
		return;
	}

	const authUser = UsersList.findByAuthUid(uid)!;

	const visitorid = req.signedCookies.visitorid || crypto.randomUUID();

	let newSessions: UserSession[] = [];

	if (authUser) {
		newSessions = authUser.sessions?.filter((session) => session.visitorid !== visitorid) || [];
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

		res.cookie('visitorid', visitorid, getSessionCookieOptions(req));
		if (isDev) {
			const tokenDev = generateDevelopmentMfaToken(
				authUser.email!,
				authUser.profile.secret!,
			);
			console.log('Use this code to login:', tokenDev);

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
				cong_prefix: userCong.settings.cong_prefix,
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

	res.cookie('visitorid', visitorid, getSessionCookieOptions(req));
	res.status(200).json(userInfo);
};

export const verifyEmailToken = async (req: Request, res: Response) => {
	const userIP = req.clientIp!;

	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const email = req.body.email as string;
	const token = req.body.token as string;

	const authUser = UsersList.findByEmail(email);

	if (!authUser) {
		res.locals.type = 'warn';
		res.locals.message = 'user record not found';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	if (!authUser.profile.email_otp) {
		res.locals.type = 'warn';
		res.locals.message = 'user email otp not found in records';
		res.status(404).json({ message: 'error_auth_invalid-token' });
		return;
	}

	if (!isEmailOneTimePasswordValid(authUser.profile.email_otp, String(token))) {
		res.locals.type = 'warn';
		res.locals.message = 'email otp is invalid';
		res.status(403).json({ message: 'error_auth_invalid-token' });
		return;
	}

	const profile = structuredClone(authUser.profile);

	delete profile.email_otp;

	await authUser.updateProfile(profile);

	const visitorid = req.signedCookies.visitorid || crypto.randomUUID();

	let newSessions: UserSession[] = [];

	if (authUser) {
		newSessions = authUser.sessions?.filter((session) => session.visitorid !== visitorid) || [];
	}
	const newSession: UserSession = {
		mfaVerified: true,
		last_seen: new Date().toISOString(),
		visitorid: visitorid,
		visitor_details: await retrieveVisitorDetails(userIP, req),
		identifier: crypto.randomUUID(),
	};

	newSessions.push(newSession);

	await authUser.updateSessions(newSessions);

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
				cong_prefix: userCong.settings.cong_prefix,
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
	res.locals.message = 'user successfully logged with email OTP';

	const customToken = await createAuthenticationToken(authUser.profile.auth_uid!);

	userInfo.custom_token = customToken;

	res.cookie('visitorid', visitorid, getSessionCookieOptions(req));
	res.status(200).json(userInfo);
};
