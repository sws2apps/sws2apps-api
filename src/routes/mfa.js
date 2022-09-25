// dependencies
import express from 'express';
import { check } from 'express-validator';

// middleware import
import { visitorChecker } from '../middleware/visitor-checker.js';

// controlllers import
import { verifyToken } from '../controllers/mfa-controller.js';

const router = express.Router();

router.use(visitorChecker());

// 2fa check
router.post(
	'/verify-token',
	check('token').isNumeric().isLength({ min: 6 }),
	check('email').isEmail(),
	verifyToken
);

export default router;
