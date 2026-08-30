import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { formatError } from '../../http/validation-errors.js';
import { getSessionCookieOptions } from '../../http/security/session-cookie-options.js';
import { BackupData } from '../backups/backup.types.js';
import type { StandardRecord } from '../../types/standard-record.js';
import {
	authenticatePocketInvitation,
	PocketAuthenticationError,
	validatePocketSession,
} from './pocket-authentication.service.js';
import {
	deletePocketAccount,
	getPocketApplications,
	getPocketUserSessions,
	PocketUserError,
	revokePocketUserSession,
	submitPocketApplication,
	submitPocketReport,
} from './pocket-user.service.js';
import {
	PocketBackupError,
	retrievePocketBackup,
	submitPocketBackup,
} from './pocket-backup.service.js';

const handlePocketBackupError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof PocketBackupError)) return false;

	res.locals.type = error.code === 'BACKUP_OUTDATED' ? 'info' : 'warn';

	if (error.code === 'INVALID_METADATA') {
		res.locals.message = 'invalid backup metadata';
		res.status(400).json({ message: 'error_api_bad-request' });
		return true;
	}

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'user not associated to any congregation';
		res.clearCookie('visitorid');
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return true;
	}

	if (error.code === 'MEMBERSHIP_REQUIRED') {
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return true;
	}

	res.locals.message = 'user backup outdated';
	res.status(400).json({ message: 'BACKUP_OUTDATED' });
	return true;
};

export const validateInvitation = async (req: Request, res: Response) => {
	// validate through express middleware
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	try {
		const authentication = await authenticatePocketInvitation({
			invitationCode: req.body.code as string,
			visitorId: req.signedCookies.visitorid,
			visitorIp: req.clientIp!,
			headers: req.headers,
		});

		res.locals.type = 'info';
		res.locals.message = 'pocket user successfully logged in';
		res.cookie('visitorid', authentication.visitorId, getSessionCookieOptions(req));
		res.status(200).json(authentication.userInfo);
	} catch (error) {
		if (!(error instanceof PocketAuthenticationError) || error.code !== 'INVALID_INVITATION') throw error;

		res.locals.type = 'warn';
		res.locals.message = 'the code received is invalid';
		res.status(400).json({ message: 'error_app_security_invalid-invitation-code' });
	}
};

export const validatePocket = async (req: Request, res: Response) => {
	try {
		const userInfo = validatePocketSession(res.locals.currentUser.id);

		res.locals.type = 'info';
		res.locals.message = 'pocket user successfully logged in';
		res.status(200).json(userInfo);
	} catch (error) {
		if (!(error instanceof PocketAuthenticationError) || error.code !== 'CONGREGATION_NOT_FOUND') throw error;

		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided code';
		res.clearCookie('visitorid');
		res.status(404).json({ message: 'error_app_congregation_not-found' });
	}
};

export const retrieveUserBackup = async (req: Request, res: Response) => {
	try {
		const backup = await retrievePocketBackup(
			res.locals.currentUser.id,
			req.headers.metadata!.toString(),
		);

		res.locals.type = 'info';
		res.locals.message = 'user retrieve backup successfully';
		res.status(200).json(backup);
	} catch (error) {
		if (!handlePocketBackupError(error, res)) throw error;
	}
};

export const saveUserBackup = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	try {
		submitPocketBackup(
			res.locals.currentUser.id,
			req.headers.metadata!.toString(),
			req.body.cong_backup as BackupData,
		);
	} catch (error) {
		if (!handlePocketBackupError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'user send backup successfully';
	res.status(200).json({ message: 'BACKUP_SENT' });
};

export const getPocketSessions = async (req: Request, res: Response) => {
	const sessions = getPocketUserSessions(res.locals.currentUser.id, req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = `user has fetched sessions successfully`;
	res.status(200).json(sessions);
};

export const deletePocketSession = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const identifier = req.body.identifier as string;

	const sessions = await revokePocketUserSession(res.locals.currentUser.id, identifier);

	res.locals.type = 'info';
	res.locals.message = `user has revoked session successfully`;
	res.status(200).json(sessions);
};

export const postPocketReport = async (req: Request, res: Response) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	try {
		submitPocketReport(res.locals.currentUser.id, req.body.report as StandardRecord);
	} catch (error) {
		if (!(error instanceof PocketUserError)) throw error;

		res.locals.type = 'warn';

		if (error.code === 'CONGREGATION_NOT_FOUND') {
			res.locals.message = 'user not associated to any congregation';
			res.clearCookie('visitorid');
			res.status(404).json({ message: 'error_app_congregation_not-found' });
			return;
		}

		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return;
	}

	res.locals.type = 'info';
	res.locals.message = `user sent report successfully`;
	res.status(200).json({ message: 'REPORT_SENT' });
};

export const getPocketAuxiliaryApplications = async (req: Request, res: Response) => {
	const results = getPocketApplications(res.locals.currentUser.id);

	res.locals.type = 'info';
	res.locals.message = `user get submitted auxiliary pioneer application list`;
	res.status(200).json(results);
};

export const submitPocketAuxiliaryApplications = async (req: Request, res: Response) => {
	submitPocketApplication(res.locals.currentUser.id, req.body.application as StandardRecord);

	res.locals.type = 'info';
	res.locals.message = `user submitted auxiliary pioneer application`;
	res.status(200).json({ message: 'APPLICATION_SENT' });
};

export const deletePocketUser = async (req: Request, res: Response) => {
	await deletePocketAccount(res.locals.currentUser.id);

	res.locals.type = 'info';
	res.locals.message = 'user deleted account successfully';
	res.status(200).json({ message: 'ACCOUNT_DELETED' });
};
