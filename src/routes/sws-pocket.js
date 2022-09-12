// dependencies
import express from 'express';
import { body } from 'express-validator';

// controllers
import {
	getSchedule,
	pocketSignUp,
	validatePocket,
} from '../controllers/sws-pocket-controller.js';

// middleware
import { pocketAuthChecker } from '../middleware/sws-pocket-auth-checker.js';

const router = express.Router();

router.post(
	'/signup',
	body('visitor_id').notEmpty(),
	body('otp_code').isLength(10),
	pocketSignUp
);

// activate auth checker middleware
router.use(pocketAuthChecker());

router.get('/validate-me', validatePocket);

router.get('/schedule', getSchedule);

export default router;
