import express from 'express';
import { body, header } from 'express-validator';
import { createSignInLink, loginUser, verifyPasswordlessInfo } from '../controllers/auth_controller.js';
import { authBearerCheck } from '../services/validator/auth.js';

const router = express.Router();

router.get('/user-login', header('Authorization').exists().notEmpty().isString().custom(authBearerCheck), loginUser);

router.post('/user-passwordless-login', body('email').isEmail(), createSignInLink);

router.post(
	'/user-passwordless-verify',
	header('Authorization').exists().notEmpty().isString().custom(authBearerCheck),
	body('email').isEmail(),
	verifyPasswordlessInfo
);

export default router;
