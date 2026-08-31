import { Request, Response } from 'express';
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

		res.locals.type = 'info';
		res.locals.message = 'OTP token verification success';
		res.status(200).json(userInfo);
	} catch (error) {
		if (!(error instanceof InvalidMfaTokenError)) throw error;

		res.locals.type = 'warn';
		res.locals.message = 'OTP token invalid';
		res.status(403).json({ message: 'TOKEN_INVALID' });
	}
};

