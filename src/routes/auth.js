import express from 'express';
import { body, check, header } from 'express-validator';
import {
	createSignInLink,
	createUserTempOTPCode,
	loginUser,
	verifyPasswordlessInfo,
	verifyUserTempOTPCode,
} from '../controllers/auth-controller.js';

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

// request email otp code
router.get('/request-otp-code', header('uid').isString().notEmpty(), header('visitorid').notEmpty(), createUserTempOTPCode);

// verify email otp code
router.post(
	'/verify-otp-code',
	header('uid').isString().notEmpty(),
	header('visitorid').notEmpty(),
	body('code').isNumeric().isLength({ min: 6 }),
	verifyUserTempOTPCode
);

export default router;
