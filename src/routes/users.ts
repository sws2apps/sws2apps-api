import express from 'express';
import { body } from 'express-validator';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	deleteUserSession,
	disableUser2FA,
	getAnnouncementsV2,
	getUserSecretToken,
	getUserSessions,
	userLogout,
	validateUser,
} from '../controllers/users_controller.js';

const router = express.Router();

// get announcements
router.get('/announcement-v2', getAnnouncementsV2);

// activate middleware at this point
router.use(visitorChecker());

// validate user for active session
router.get('/validate-me', validateUser);

// get user 2fa token
router.get('/:id/2fa', getUserSecretToken);

// disable user 2fa
router.get('/:id/2fa/disable', disableUser2FA);

// get user sessions
router.get('/:id/sessions', getUserSessions);

// delete user session
router.delete('/:id/sessions', body('session').notEmpty(), deleteUserSession);

// logout current user session
router.get('/logout', userLogout);

export default router;
