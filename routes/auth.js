// import dependencies
import express from 'express';
import { body } from 'express-validator';

// import controller
import { loginUser } from '../controllers/auth-controller.js';

const router = express.Router();

router.post(
	'/user-login',
	body('email').isEmail(),
	body('password').isLength({ min: 6 }),
	body('visitor_id').notEmpty(),
	loginUser
);

export default router;
