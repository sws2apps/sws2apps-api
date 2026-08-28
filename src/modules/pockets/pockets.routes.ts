import express from 'express';
import { body, header } from 'express-validator';
import { requirePocketSession } from '../../http/middleware/session-authentication.middleware.js';
import {
	deletePocketSession,
	deletePocketUser,
	getPocketAuxiliaryApplications,
	getPocketSessions,
	postPocketReport,
	retrieveUserBackup,
	saveUserBackup,
	submitPocketAuxiliaryApplications,
	validateInvitation,
	validatePocket,
} from './pockets.controller.js';

const pocketRouter = express.Router();

// signup by validating invitation code
pocketRouter.post('/signup', body('code').isString().notEmpty(), validateInvitation);

// activate middleware at this point
pocketRouter.use(requirePocketSession());

// validate user for active session
pocketRouter.get('/validate-me', validatePocket);

// retrieve user backup
pocketRouter.get('/backup', header('metadata').isString().notEmpty(), retrieveUserBackup);

// send user backup
pocketRouter.post('/backup', header('metadata').isString().notEmpty(), body('cong_backup').isObject(), saveUserBackup);

// get user sessions
pocketRouter.get('/sessions', getPocketSessions);

// delete user session
pocketRouter.delete('/sessions', body('identifier').isString().notEmpty(), deletePocketSession);

// post field service report
pocketRouter.post('/field-service-reports', body('report').isObject().notEmpty(), postPocketReport);

// get auxiliary pioneer applications
pocketRouter.get('/applications', getPocketAuxiliaryApplications);

// submit auxiliary pioneer application
pocketRouter.post('/applications', body('application').isObject().notEmpty(), submitPocketAuxiliaryApplications);

// delete pocket user
pocketRouter.delete('/erase', deletePocketUser);

export default pocketRouter;
