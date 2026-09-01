import { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';
import { getSessionCookieOptions } from '#http/security/session-cookie-options.js';
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
		sendClientError(res, 404, 'error_auth_invalid-token', 'the idToken received is invalid');
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
			sendSuccess(res, {
				message: 'MFA_VERIFY',
				code: authentication.developmentMfaCode,
			}, 'user required to verify mfa');
			return;
		}

		sendSuccess(res, authentication.userInfo, 'user successfully logged in without MFA');
	} catch (error) {
		if (!(error instanceof AuthenticationError) || error.code !== 'USER_NOT_FOUND') throw error;

		sendClientError(res, 404, 'USER_NOT_FOUND', 'user record not found');
	}
};

export const loginUser = async (req: Request, res: Response) => {
	await completeTokenAuthentication(req, res, true);
};

export const createSignInLink = async (req: Request, res: Response) => {
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

	sendSuccess(
		res,
		signIn.emailEnabled
			? { message: 'SIGNIN_LINK_SEND' }
			: { link: signIn.link, otp: signIn.otp },
		'passwordless link will be sent to user',
	);
};

export const verifyPasswordlessInfo = async (req: Request, res: Response) => {
	await completeTokenAuthentication(req, res, false);
};

export const verifyEmailToken = async (req: Request, res: Response) => {
	const visitorId = req.signedCookies.visitorid || crypto.randomUUID();

	try {
		const userInfo = await completeEmailOtpAuthentication({
			email: req.body.email as string,
			oneTimePassword: String(req.body.token),
			visitorId,
			visitorIp: req.clientIp!,
			headers: req.headers,
		});

		res.cookie('visitorid', visitorId, getSessionCookieOptions(req));
		sendSuccess(res, userInfo, 'user successfully logged with email OTP');
	} catch (error) {
		if (!(error instanceof AuthenticationError)) throw error;

		if (error.code === 'USER_NOT_FOUND') {
			sendClientError(res, 404, 'USER_NOT_FOUND', 'user record not found');
			return;
		}

		const logMessage = error.code === 'OTP_NOT_FOUND'
			? 'user email otp not found in records'
			: 'email otp is invalid';
		const statusCode = error.code === 'OTP_NOT_FOUND' ? 404 : 403;
		sendClientError(res, statusCode, 'error_auth_invalid-token', logMessage);
	}
};
