import { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';
import {
	InvalidMfaTokenError,
	verifyMfaToken,
} from './mfa.service.js';

export const verifyToken = async (req: Request, res: Response) => {
	try {
		const userInfo = await verifyMfaToken({
			userId: res.locals.currentUser.id,
			sessions: res.locals.currentUser.sessions,
			visitorId: req.signedCookies.visitorid,
			token: req.body.token as string,
		});

		sendSuccess(res, userInfo, 'OTP token verification success');
	} catch (error) {
		if (!(error instanceof InvalidMfaTokenError)) throw error;

		sendClientError(res, 403, 'TOKEN_INVALID', 'OTP token invalid');
	}
};
