import express from 'express';
import { body, header } from 'express-validator';
import { visitorChecker } from '../middleware/visitor_checker.js';
import {
	deleteUser,
	deleteUserSession,
	disableUser2FA,
	getAuxiliaryApplications,
	getUserSecretToken,
	getUserSessions,
	getUserUpdates,
	joinCongregation,
	postUserReport,
	retrieveUserBackup,
	saveUserBackup,
	saveUserChunkedBackup,
	submitAuxiliaryApplication,
	userLogout,
	userPostFeedback,
	validateUser,
} from '../controllers/users_controller.js';

const router = express.Router();

// activate middleware at this point
router.use(visitorChecker());

// validate user for active session
router.get('/validate-me', validateUser);

// logout current user session
router.get('/logout', userLogout);

// request access to a congregation
router.post(
	'/:id/join-congregation',
	body('country_code').isString().notEmpty(),
	body('cong_number').isString().notEmpty(),
	body('firstname').isString().notEmpty(),
	body('lastname').isString(),
	joinCongregation
);

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
router.post('/:id/field-service-reports', body('report').isObject().notEmpty(), postUserReport);

// retrieve congregation backup
router.get('/:id/backup', header('metadata').isString(), retrieveUserBackup);

// save congregation backup in chunk
router.post(
	'/:id/backup/chunked',
	header('metadata').isString(),
	body('chunkIndex').toInt().isNumeric().notEmpty(),
	body('totalChunks').toInt().isNumeric().notEmpty(),
	body('chunkData').isString().notEmpty(),
	saveUserChunkedBackup
);

// save congregation backup
router.post('/:id/backup', body('cong_backup').isObject(), saveUserBackup);

// get user updates
router.get('/:id/updates-routine', getUserUpdates);

// get user updates
router.post('/:id/feedback', body('subject').notEmpty().isString(), body('message').notEmpty().isString(), userPostFeedback);

// delete user
router.delete('/:id/erase', deleteUser);

export default router;
