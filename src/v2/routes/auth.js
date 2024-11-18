import express from 'express';
import { body, check } from 'express-validator';
import { createSignInLink, loginUser, verifyPasswordlessInfo } from '../controllers/auth-controller.js';

const router = express.Router();

router.post('/user-login', check('uid').isString().notEmpty(), body('visitorid').notEmpty(), loginUser);

router.post('/user-passwordless-login', body('email').isEmail(), createSignInLink);

router.post(
	'/user-passwordless-verify',
	check('uid').isString().notEmpty(),
	body('email').isEmail(),
	body('visitorid').notEmpty(),
	verifyPasswordlessInfo
);

export default router;
