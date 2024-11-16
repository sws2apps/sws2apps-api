import express from 'express';
import { body, check } from 'express-validator';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	deleteUserSession,
	disableUser2FA,
	getAuxiliaryApplications,
	getUserSecretToken,
	getUserSessions,
	getUserUpdates,
	postUserReport,
	retrieveUserBackup,
	saveUserBackup,
	submitAuxiliaryApplication,
	userLogout,
	validateUser,
} from '../controllers/users_controller.js';

const router = express.Router();

// activate middleware at this point
router.use(visitorChecker());

// validate user for active session
router.get('/validate-me', validateUser);

// logout current user session
router.get('/logout', userLogout);

// get user 2fa token
router.get('/:id/2fa', getUserSecretToken);

// disable user 2fa
router.get('/:id/2fa/disable', disableUser2FA);

// get user sessions
router.get('/:id/sessions', getUserSessions);

// delete user session
router.delete('/:id/sessions', body('identifier').notEmpty(), deleteUserSession);

// get auxiliary pioneer applications
router.get('/:id/applications', getAuxiliaryApplications);

// submit auxiliary pioneer application
router.post('/:id/applications', body('application').isObject().notEmpty(), submitAuxiliaryApplication);

// post field service report
router.post('/:idfield-service-reports', body('report').isObject().notEmpty(), postUserReport);

// retrieve congregation backup
router.get('/:id/backup', retrieveUserBackup);

// save congregation backup
router.post('/:id/backup', check('lastbackup').isString(), body('cong_backup').isObject(), saveUserBackup);

// get user updates
router.get('/:id/updates-routine', getUserUpdates);

export default router;
