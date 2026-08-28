import express from 'express';
import { body, header } from 'express-validator';
import { createSignInLink, loginUser, verifyEmailToken, verifyPasswordlessInfo } from './auth.controller.js';
import { validateBearerAuthorization } from '../../http/security/bearer-token.js';

const authRouter = express.Router();

authRouter.get(
	'/user-login',
	header('Authorization').exists().notEmpty().isString().custom(validateBearerAuthorization),
	loginUser,
);

authRouter.post('/user-passwordless-login', body('email').isEmail(), createSignInLink);

authRouter.post(
	'/user-passwordless-verify',
	header('Authorization').exists().notEmpty().isString().custom(validateBearerAuthorization),
	verifyPasswordlessInfo,
);

authRouter.post(
	'/verify-email-token',
	body('email').isEmail(),
	body('token').isNumeric().isLength({ min: 6, max: 6 }),
	verifyEmailToken,
);

export default authRouter;
