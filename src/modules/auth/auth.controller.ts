import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { generateDevelopmentMfaToken } from '../mfa/development-token.js';
import { UsersList } from '../users/users.js';
import { formatError } from '../../http/validation-errors.js';
import { getSessionCookieOptions } from '../../http/security/session-cookie-options.js';
import {
	createAuthenticationSession,
	createPasswordlessSignIn,
	createAuthenticationToken,
	buildUserAuthenticationResponse,
	getAuthenticationUserDisplayName,
	verifyAuthenticationToken,
} from './auth.service.js';
import { env } from '../../config/env.js';
import { isEmailOneTimePasswordValid } from './email-otp.js';
import { isPasswordlessEmailEnabled } from './auth-notifications.service.js';

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

	await createAuthenticationSession({
		userId: authUser.id,
		visitorId: visitorid,
		visitorIp: userIP,
		headers: req.headers,
		mfaVerified: false,
	});

	if (authUser.profile.mfa_enabled) {
		res.locals.type = 'info';
		res.locals.message = 'user required to verify mfa';

		res.cookie('visitorid', visitorid, getSessionCookieOptions(req));

		if (isDev) {
			const tokenDev = generateDevelopmentMfaToken(
				authUser.email!,
				authUser.profile.secret!,
			);
			res.status(200).json({ message: 'MFA_VERIFY', code: tokenDev });
		} else {
			res.status(200).json({ message: 'MFA_VERIFY' });
		}

		return;
	}

	const userInfo = buildUserAuthenticationResponse({ authUser });

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

	const email = req.body.email as string;
	const origin = req.headers.origin as string;
	const language = (req.headers?.applanguage as string) || 'eng';

	if (isPasswordlessEmailEnabled()) {
		req.i18n.changeLanguage(language);
	}

	const signIn = await createPasswordlessSignIn({
		email,
		origin,
		emailContent: {
			subject: req.t('tr_login'),
			title: req.t('tr_login'),
			description: req.t('tr_loginDesc'),
			loginButtonLabel: req.t('tr_loginBtn'),
			alternativeLinkText: req.t('tr_loginAltText'),
			ignoreRequestText: req.t('tr_loginIgnoreText'),
			oneTimePasswordLabel: req.t('tr_loginOTP'),
			oneTimePasswordDurationText: req.t('tr_loginOTPDuration'),
		},
	});

	res.locals.type = 'info';
	res.locals.message = 'passwordless link will be sent to user';
	res.status(200).json(
		signIn.emailEnabled
			? { message: 'SIGNIN_LINK_SEND' }
			: { link: signIn.link, otp: signIn.otp },
	);
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

	await createAuthenticationSession({
		userId: authUser.id,
		visitorId: visitorid,
		visitorIp: userIP,
		headers: req.headers,
		mfaVerified: false,
	});

	if (authUser.profile.mfa_enabled) {
		res.locals.type = 'info';
		res.locals.message = 'user required to verify mfa';

		res.cookie('visitorid', visitorid, getSessionCookieOptions(req));
		if (isDev) {
			const tokenDev = generateDevelopmentMfaToken(
				authUser.email!,
				authUser.profile.secret!,
			);
			res.status(200).json({ message: 'MFA_VERIFY', code: tokenDev });
		} else {
			res.status(200).json({ message: 'MFA_VERIFY' });
		}

		return;
	}

	const userInfo = buildUserAuthenticationResponse({ authUser });

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

	await createAuthenticationSession({
		userId: authUser.id,
		visitorId: visitorid,
		visitorIp: userIP,
		headers: req.headers,
		mfaVerified: true,
	});

	const userInfo = buildUserAuthenticationResponse({ authUser });

	res.locals.type = 'info';
	res.locals.message = 'user successfully logged with email OTP';

	const customToken = await createAuthenticationToken(authUser.profile.auth_uid!);

	userInfo.custom_token = customToken;

	res.cookie('visitorid', visitorid, getSessionCookieOptions(req));
	res.status(200).json(userInfo);
};
