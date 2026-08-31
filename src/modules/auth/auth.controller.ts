import { Request, Response } from 'express';
import { rejectInvalidRequest } from '../../http/validation-errors.js';
import { getSessionCookieOptions } from '../../http/security/session-cookie-options.js';
import {
	completeAuthentication,
} from './authentication-completion.service.js';
import { AuthenticationError } from './authentication-error.js';
import {
	verifyAuthenticationToken,
} from './authentication-identity.service.js';
import {
	completeEmailOtpAuthentication,
	createPasswordlessSignIn,
} from './passwordless-authentication.service.js';
import { isPasswordlessEmailEnabled } from './auth-notifications.service.js';

const completeTokenAuthentication = async (
	req: Request,
	res: Response,
	createUserWhenMissing: boolean,
) => {
	const idToken = req.headers.authorization!.split('Bearer ')[1];
	const authenticationUserId = await verifyAuthenticationToken(idToken);

	if (!authenticationUserId) {
		res.locals.type = 'warn';
		res.locals.message = 'the idToken received is invalid';
		res.status(404).json({ message: 'error_auth_invalid-token' });
		return;
	}

	const visitorId: string = req.signedCookies.visitorid || crypto.randomUUID();

	try {
		const authentication = await completeAuthentication({
			authenticationUserId,
			visitorId,
			visitorIp: req.clientIp!,
			headers: req.headers,
			createUserWhenMissing,
		});

		res.cookie('visitorid', visitorId, getSessionCookieOptions(req));

		if (authentication.requiresMfa) {
			res.locals.type = 'info';
			res.locals.message = 'user required to verify mfa';
			res.status(200).json({
				message: 'MFA_VERIFY',
				code: authentication.developmentMfaCode,
			});
			return;
		}

		res.locals.type = 'info';
		res.locals.message = 'user successfully logged in without MFA';
		res.status(200).json(authentication.userInfo);
	} catch (error) {
		if (!(error instanceof AuthenticationError) || error.code !== 'USER_NOT_FOUND') throw error;

		res.locals.type = 'warn';
		res.locals.message = 'user record not found';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
	}
};

export const loginUser = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	await completeTokenAuthentication(req, res, true);
};

export const createSignInLink = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

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
	if (rejectInvalidRequest(req, res)) return;

	await completeTokenAuthentication(req, res, false);
};

export const verifyEmailToken = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const visitorId = req.signedCookies.visitorid || crypto.randomUUID();

	try {
		const userInfo = await completeEmailOtpAuthentication({
			email: req.body.email as string,
			oneTimePassword: String(req.body.token),
			visitorId,
			visitorIp: req.clientIp!,
			headers: req.headers,
		});

		res.locals.type = 'info';
		res.locals.message = 'user successfully logged with email OTP';
		res.cookie('visitorid', visitorId, getSessionCookieOptions(req));
		res.status(200).json(userInfo);
	} catch (error) {
		if (!(error instanceof AuthenticationError)) throw error;

		res.locals.type = 'warn';
		if (error.code === 'USER_NOT_FOUND') {
			res.locals.message = 'user record not found';
			res.status(404).json({ message: 'USER_NOT_FOUND' });
			return;
		}

		res.locals.message = error.code === 'OTP_NOT_FOUND'
			? 'user email otp not found in records'
			: 'email otp is invalid';
		res.status(error.code === 'OTP_NOT_FOUND' ? 404 : 403).json({
			message: 'error_auth_invalid-token',
		});
	}
};
