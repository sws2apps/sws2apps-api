import { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { formatError } from '../../http/validation-errors.js';
import {
	InvalidMfaTokenError,
	verifyMfaToken,
} from './mfa.service.js';

export const verifyToken = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const message = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${message}`;
		res.status(400).json({ message: 'error_api_bad-request' });
		return;
	}

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
