import express from 'express';
import { body, header } from 'express-validator';
import { createSignInLink, loginUser, verifyEmailToken, verifyPasswordlessInfo } from './auth.controller.js';
import { validateBearerAuthorization } from '../../http/security/bearer-token.js';
import { isPasswordlessOriginAllowed } from '../../http/security/cors.js';
import { env } from '../../config/env.js';
import { REQUEST_LIMITS } from '../../http/request-limits.js';

const authRouter = express.Router();

authRouter.get(
	'/user-login',
	header('Authorization').exists().notEmpty().isString().custom(validateBearerAuthorization),
	loginUser,
);

authRouter.post(
	'/user-passwordless-login',
	body('email').isEmail().isLength({ max: REQUEST_LIMITS.email }),
	header('Origin').isURL({
		protocols: ['http', 'https'],
		require_protocol: true,
		require_tld: false,
	}).custom((origin: string) => isPasswordlessOriginAllowed(origin, env.isProduction)),
	header('applanguage').optional().isString().isLength({ min: 2, max: 10 }),
	createSignInLink,
);

authRouter.post(
	'/user-passwordless-verify',
	header('Authorization').exists().notEmpty().isString().custom(validateBearerAuthorization),
	verifyPasswordlessInfo,
);

authRouter.post(
	'/verify-email-token',
	body('email').isEmail().isLength({ max: REQUEST_LIMITS.email }),
	body('token').isNumeric().isLength({ min: 6, max: 6 }),
	verifyEmailToken,
);

export default authRouter;
