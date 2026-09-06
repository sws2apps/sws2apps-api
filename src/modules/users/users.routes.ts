import express from 'express';
import { body, header } from 'express-validator';
import {
	isBackupChunkWithinByteLimit,
	MAX_BACKUP_CHUNKS,
} from '#modules/backups/index.js';
import { requireAuthenticatedSession } from '#http/middleware/session-authentication.middleware.js';
import { requireCurrentUserResource } from '#http/middleware/user-resource-authorization.middleware.js';
import { REQUEST_LIMITS } from '#http/request-limits.js';
import { validateRequest } from '#http/validation-errors.js';
import {
	deleteUser,
	deleteUserSession,
	disableUser2FA,
	getUserSecretToken,
	getUserSessions,
	userLogout,
	validateUser,
} from './controllers/users-account.controller.js';
import {
	retrieveUserBackup,
	saveUserBackup,
	saveUserChunkedBackup,
} from './controllers/users-backup.controller.js';
import {
	getAuxiliaryApplications,
	getUserUpdates,
	joinCongregation,
	postUserReport,
	submitAuxiliaryApplication,
	userPostFeedback,
} from './controllers/users-congregation-activity.controller.js';

const userRouter = express.Router();

// activate middleware at this point
userRouter.use(requireAuthenticatedSession());

// validate user for active session and link the caller installation
userRouter.get(
	'/validate-me',
	header('installation').optional({ values: 'null' }).isString().notEmpty(),
	validateRequest,
	validateUser,
);

// logout current user session
userRouter.get('/logout', userLogout);

// Every account-scoped endpoint must target the authenticated user.
userRouter.use('/:id', requireCurrentUserResource);

// request access to a congregation
userRouter.post(
	'/:id/join-congregation',
	body('country_code').isString().notEmpty(),
	body('cong_name').isString().notEmpty(),
	body('firstname').isString().notEmpty(),
	body('lastname').isString(),
	validateRequest,
	joinCongregation,
);

// get user 2fa token
userRouter.get('/:id/2fa', getUserSecretToken);

// disable user 2fa
userRouter.get('/:id/2fa/disable', disableUser2FA);

// get user sessions
userRouter.get('/:id/sessions', getUserSessions);

// delete user session
userRouter.delete(
	'/:id/sessions',
	body('identifier')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.identifier }),
	validateRequest,
	deleteUserSession,
);

// get auxiliary pioneer applications
userRouter.get('/:id/applications', getAuxiliaryApplications);

// submit auxiliary pioneer application
userRouter.post('/:id/applications', body('application').isObject().notEmpty(), validateRequest, submitAuxiliaryApplication);

// post field service report
userRouter.post('/:id/field-service-reports', body('report').isObject().notEmpty(), validateRequest, postUserReport);

// retrieve congregation backup
userRouter.get('/:id/backup', header('metadata').isString().notEmpty(), validateRequest, retrieveUserBackup);

// save congregation backup in chunk
userRouter.post(
	'/:id/backup/chunked',
	header('metadata').isString().notEmpty(),
	body('uploadId')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.identifier }),
	body('chunkIndex').isInt({ min: 0 }).toInt(),
	body('totalChunks').isInt({ min: 1, max: MAX_BACKUP_CHUNKS }).toInt(),
	body('chunkData')
		.isString()
		.notEmpty()
		.custom((chunkData) => isBackupChunkWithinByteLimit(chunkData)),
	validateRequest,
	saveUserChunkedBackup,
);

// save congregation backup
userRouter.post('/:id/backup', body('cong_backup').isObject(), validateRequest, saveUserBackup);

// get user updates
userRouter.get('/:id/updates-routine', getUserUpdates);

// get user updates
userRouter.post(
	'/:id/feedback',
	body('subject')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.messageSubject }),
	body('message')
		.isString()
		.notEmpty()
		.isLength({ max: REQUEST_LIMITS.messageBody }),
	validateRequest,
	userPostFeedback,
);

// delete user
userRouter.delete('/:id/erase', deleteUser);

export default userRouter;
