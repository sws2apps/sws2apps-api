import express from 'express';
import { body, check } from 'express-validator';
import { pocketVisitorChecker } from '../middleware/visitor_checker.js';
import {
	deletePocketSession,
	getPocketSessions,
	postPocketReport,
	retrieveUserBackup,
	saveUserBackup,
	validateInvitation,
	validatePocket,
} from '../controllers/pockets_controller.js';

const router = express.Router();

// signup by validating invitation code
router.post('/signup', body('code').isString().notEmpty(), validateInvitation);

// activate middleware at this point
router.use(pocketVisitorChecker());

// validate user for active session
router.get('/validate-me', validatePocket);

// retrieve user backup
router.get('/backup', retrieveUserBackup);

// send user backup
router.post('/backup', check('lastbackup').isString(), body('cong_backup').isObject(), saveUserBackup);

// get user sessions
router.get('/sessions', getPocketSessions);

// delete user session
router.delete('/sessions', body('identifier').notEmpty(), deletePocketSession);

// post field service report
router.post('/field-service-reports', body('report').isObject().notEmpty(), postPocketReport);

export default router;
