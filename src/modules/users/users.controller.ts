import { Request, Response } from 'express';
import { rejectInvalidRequest } from '../../http/validation-errors.js';
import type { StandardRecord } from '../../types/standard-record.js';
import type { BackupData } from '../backups/backup.types.js';
import { retrieveUserBackup as retrieveUserBackupData } from './users-backup.service.js';
import { UserBackupError } from './user-backup-context.js';
import {
	saveUserBackup as saveUserBackupData,
	saveUserChunkedBackup as saveUserChunkedBackupData,
} from './user-backup-upload.service.js';
import {
	deleteUserAccount,
	disableUserMfa,
	getUserActiveSessions,
	getUserMfaEnrollment,
	getValidatedUserAccount,
	logoutUserSession,
	revokeUserSession,
	UserAccountError,
} from './users-account.service.js';
import {
	getUserAuxiliaryApplications,
	getUserCongregationUpdates,
	requestCongregationMembership,
	submitUserAuxiliaryApplication,
	submitUserFeedback,
	submitUserFieldServiceReport,
	UserCongregationActivityError,
} from './users-congregation-activity.service.js';

const handleUserCongregationActivityError = (
	error: unknown,
	res: Response,
): boolean => {
	if (!(error instanceof UserCongregationActivityError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_ASSIGNED') {
		res.locals.message = 'user does not have an assigned congregation';
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });
		return true;
	}

	res.locals.message = 'user congregation is invalid';
	res.status(404).json({ message: 'error_app_congregation_not-found' });
	return true;
};

const handleUserBackupError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof UserBackupError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_ASSIGNED') {
		res.locals.message = 'user does not have an assigned congregation';
		res.status(400).json({ message: 'CONG_NOT_ASSIGNED' });
		return true;
	}

	if (error.code === 'INVALID_METADATA') {
		res.locals.message = 'backup metadata is invalid';
		res.status(400).json({ message: 'BACKUP_METADATA_INVALID' });
		return true;
	}

	if (error.code === 'INVALID_BACKUP') {
		res.locals.message = 'backup payload is invalid';
		res.status(400).json({ message: 'BACKUP_PAYLOAD_INVALID' });
		return true;
	}

	if (error.code === 'INVALID_CHUNK') {
		res.locals.message = 'backup chunk is invalid';
		res.status(400).json({ message: 'BACKUP_CHUNK_INVALID' });
		return true;
	}

	res.locals.message = 'user congregation is invalid';
	res.status(404).json({ message: 'error_app_congregation_not-found' });
	return true;
};

export const validateUser = async (req: Request, res: Response) => {
	try {
		const account = getValidatedUserAccount(res.locals.currentUser.id);

		res.locals.type = 'info';
		res.locals.message = 'visitor id has been validated';
		res.status(200).json(account);
	} catch (error) {
		if (!(error instanceof UserAccountError)) throw error;

		res.locals.type = 'warn';
		res.locals.message = error.code === 'CONGREGATION_NOT_ASSIGNED'
			? 'email address not associated with a congregation'
			: 'user congregation is invalid';
		res.status(404).json({ message: 'CONG_NOT_FOUND' });
	}
};

export const getUserSecretToken = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const enrollment = await getUserMfaEnrollment(id);

	res.locals.type = 'info';
	res.locals.message = `the user has fetched 2fa successfully`;

	res.status(200).json(enrollment);
};

export const getUserSessions = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
	}

	const sessions = getUserActiveSessions(id, req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = `the user has fetched sessions successfully`;
	res.status(200).json(sessions);
};

export const deleteUserSession = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user and session id are required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
	}

	if (rejectInvalidRequest(req, res)) return;

	const identifier = req.body.identifier as string;

	const sessions = await revokeUserSession(id, identifier);

	res.locals.type = 'info';
	res.locals.message = `the user has revoked session successfully`;
	res.status(200).json(sessions);
};

export const userLogout = async (req: Request, res: Response) => {
	const visitorId = req.signedCookies.visitorid as string;

	await logoutUserSession(res.locals.currentUser?.id, visitorId);

	res.locals.type = 'info';
	res.locals.message = `the current user has logged out`;

	res.clearCookie('visitorid', { path: '/' });
	res.status(200).json({ message: 'OK' });
};

export const disableUser2FA = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	await disableUserMfa(id);

	res.locals.type = 'info';
	res.locals.message = `the user disabled 2fa successfully`;
	res.status(200).json({ message: 'MFA_DISABLED' });
};

export const getAuxiliaryApplications = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	let results;

	try {
		results = getUserAuxiliaryApplications(id);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user get submitted auxiliary pioneer application list`;
	res.status(200).json(results);
};

export const submitAuxiliaryApplication = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	try {
		submitUserAuxiliaryApplication(id, req.body.application as StandardRecord);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user submitted auxiliary pioneer application`;
	res.status(200).json({ message: 'APPLICATION_SENT' });
};

export const postUserReport = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	try {
		submitUserFieldServiceReport(id, req.body.report as StandardRecord);
	} catch (error) {
		if (!handleUserCongregationActivityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user sent report successfully`;
	res.status(200).json({ message: 'REPORT_SENT' });
};

export const retrieveUserBackup = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	let result: BackupData;

	try {
		result = await retrieveUserBackupData(id, req.headers.metadata!.toString());
	} catch (error) {
		if (!handleUserBackupError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user retrieve backup successfully';
	res.status(200).json(result);
};

export const saveUserBackup = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const cong_backup = req.body.cong_backup as BackupData;
	let outcome;

	try {
		outcome = await saveUserBackupData(id, cong_backup);
	} catch (error) {
		if (!handleUserBackupError(error, res)) throw error;
		return;
	}

	if (outcome.status === 'conflict') {
		res.locals.message = JSON.stringify({
			key: outcome.key,
			remote_value: outcome.currentValue,
			incoming_value: outcome.incomingValue,
		});

		res.locals.type = 'warn';
		res.status(400).json({ message: 'BACKUP_OUTDATED' });

		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user send backup for congregation successfully';
	res.status(200).json({ message: 'BACKUP_SENT' });
};

export const getUserUpdates = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	let result;

	try {
		result = await getUserCongregationUpdates(id);
	} catch (error) {
		if (!(error instanceof UserCongregationActivityError)) throw error;

		res.locals.type = 'warn';
		res.locals.message = error.code === 'CONGREGATION_NOT_ASSIGNED'
			? 'user does not have an assigned congregation'
			: 'user congregation is invalid';
		res.status(403).json({
			message: error.code === 'CONGREGATION_NOT_ASSIGNED'
				? 'CONG_NOT_ASSIGNED'
				: 'error_app_congregation_not-found',
		});
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user retrieve updates successfully';
	res.status(200).json(result);
};

export const userPostFeedback = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const { subject, message } = req.body;

	try {
		submitUserFeedback(id, subject as string, message as string);
	} catch (error) {
		if (!(error instanceof UserCongregationActivityError)) throw error;

		res.locals.type = 'warn';
		res.locals.message = error.code === 'CONGREGATION_NOT_ASSIGNED'
			? 'user does not have an assigned congregation'
			: 'user congregation is invalid';
		res.status(403).json({
			message: error.code === 'CONGREGATION_NOT_ASSIGNED'
				? 'CONG_NOT_ASSIGNED'
				: 'error_app_congregation_not-found',
		});
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user sent feedback successfully';
	res.status(200).json({ message: 'MESSAGE_SENT' });
};

export const deleteUser = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	await deleteUserAccount(id);

	res.locals.type = 'info';
	res.locals.message = 'user deleted account successfully';
	res.status(200).json({ message: 'ACCOUNT_DELETED' });
};

export const joinCongregation = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id are required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });
	}

	const outcome = await requestCongregationMembership(id, {
		countryCode: req.body.country_code as string,
		congregationName: req.body.cong_name as string,
		firstname: req.body.firstname as string,
		lastname: (req.body.lastname || '') as string,
	});

	if (outcome === 'already_member') {
		res.locals.type = 'warn';
		res.locals.message = `user already member of the congregation`;
		res.status(400).json({ message: 'ALREADY_MEMBER' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user request to join a congregation`;
	res.status(200).json({ message: 'REQUEST_SENT' });
};

export const saveUserChunkedBackup = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = `invalid input: user id is required`;
		res.status(400).json({ message: 'USER_ID_INVALID' });

		return;
	}

	const uploadId = req.body.uploadId as string;
	const chunkIndex = req.body.chunkIndex as number;
	const chunkData = req.body.chunkData as string;
	const totalChunks = req.body.totalChunks as number;

	if (!uploadId || chunkIndex == null || !chunkData || !totalChunks) {
		res.locals.type = 'warn';
		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	let outcome;

	try {
		outcome = await saveUserChunkedBackupData(id, req.headers.metadata!.toString(), {
			uploadId,
			chunkIndex,
			chunkData,
			totalChunks,
		});
	} catch (error) {
		if (!handleUserBackupError(error, res)) throw error;
		return;
	}

	if (outcome.status === 'metadata_conflict') {
		res.locals.message = JSON.stringify({
			key: outcome.key,
			remote_value: outcome.currentValue,
			incoming_value: outcome.incomingValue,
		});

		res.locals.type = 'warn';
		res.status(409).json({ message: 'error_api_sync-conflict' });

		return;
	}

	if (outcome.status === 'backup_in_progress') {
		res.locals.type = 'warn';
		res.locals.message = 'congregation already has a backup in progress';
		res.status(409).json({ message: 'error_api_sync-conflict' });

		return;
	}

	res.locals.type = 'info';
	if (outcome.status === 'saved') {
		res.locals.message = 'user send backup for congregation successfully';
		res.status(200).json({ message: 'BACKUP_SENT' });
		return;
	}

	res.locals.message = 'congregation backup chunk processed';
	res.status(200).json({ message: 'BACKUP_CHUNK_RECEIVED' });
};
