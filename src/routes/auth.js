import express from 'express';
import { body, check } from 'express-validator';
import { createSignInLink, loginUser, updatePasswordlessInfo } from '../controllers/auth-controller.js';

const router = express.Router();

router.post('/user-login', check('uid').isString().notEmpty(), body('visitorid').notEmpty(), loginUser);

router.post('/user-passwordless-login', body('email').isEmail(), createSignInLink);

router.post(
	'/user-passwordless-info',
	check('uid').isString().notEmpty(),
	body('email').isEmail(),
	body('fullname').isString().notEmpty(),
	body('visitorid').notEmpty(),
	updatePasswordlessInfo
);

export default router;
