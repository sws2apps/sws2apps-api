import { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';
import { getSessionCookieOptions } from '#http/security/session-cookie-options.js';
import { BackupData } from '#modules/backups/index.js';
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

	if (error.code === 'INVALID_METADATA') {
		sendClientError(res, 400, 'error_api_bad-request', 'invalid backup metadata');
		return true;
	}

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.clearCookie('visitorid');
		sendClientError(res, 404, 'error_app_congregation_not-found', 'user not associated to any congregation');
		return true;
	}

	if (error.code === 'MEMBERSHIP_REQUIRED') {
		sendClientError(res, 403, 'error_api_unauthorized-request', 'user not authorized to access the provided congregation');
		return true;
	}

	sendClientError(res, 400, 'BACKUP_OUTDATED', 'user backup outdated', 'info');
	return true;
};

export const validateInvitation = async (req: Request, res: Response) => {
	try {
		const authentication = await authenticatePocketInvitation({
			invitationCode: req.body.code as string,
			visitorId: req.signedCookies.visitorid,
			visitorIp: req.clientIp!,
			headers: req.headers,
		});

		res.cookie('visitorid', authentication.visitorId, getSessionCookieOptions(req));
		sendSuccess(res, authentication.userInfo, 'pocket user successfully logged in');
	} catch (error) {
		if (!(error instanceof PocketAuthenticationError) || error.code !== 'INVALID_INVITATION') throw error;

		sendClientError(res, 400, 'error_app_security_invalid-invitation-code', 'the code received is invalid');
	}
};

export const validatePocket = async (req: Request, res: Response) => {
	try {
		const userInfo = validatePocketSession(res.locals.currentUser.id);

		sendSuccess(res, userInfo, 'pocket user successfully logged in');
	} catch (error) {
		if (!(error instanceof PocketAuthenticationError) || error.code !== 'CONGREGATION_NOT_FOUND') throw error;

		res.clearCookie('visitorid');
		sendClientError(res, 404, 'error_app_congregation_not-found', 'no congregation could not be found with the provided code');
	}
};

export const retrieveUserBackup = async (req: Request, res: Response) => {
	try {
		const backup = await retrievePocketBackup(
			res.locals.currentUser.id,
			req.headers.metadata!.toString(),
		);

		sendSuccess(res, backup, 'user retrieve backup successfully');
	} catch (error) {
		if (!handlePocketBackupError(error, res)) throw error;
	}
};

export const saveUserBackup = async (req: Request, res: Response) => {
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

	sendSuccess(res, { message: 'BACKUP_SENT' }, 'user send backup successfully');
};

export const getPocketSessions = async (req: Request, res: Response) => {
	const sessions = getPocketUserSessions(res.locals.currentUser.id, req.signedCookies.visitorid);

	sendSuccess(res, sessions, `user has fetched sessions successfully`);
};

export const deletePocketSession = async (req: Request, res: Response) => {
	const identifier = req.body.identifier as string;

	const sessions = await revokePocketUserSession(res.locals.currentUser.id, identifier);

	sendSuccess(res, sessions, `user has revoked session successfully`);
};

export const postPocketReport = async (req: Request, res: Response) => {
	try {
		submitPocketReport(res.locals.currentUser.id, req.body.report as StandardRecord);
	} catch (error) {
		if (!(error instanceof PocketUserError)) throw error;

		if (error.code === 'CONGREGATION_NOT_FOUND') {
			res.clearCookie('visitorid');
			sendClientError(res, 404, 'error_app_congregation_not-found', 'user not associated to any congregation');
			return;
		}

		sendClientError(res, 403, 'error_api_unauthorized-request', 'user not authorized to access the provided congregation');
		return;
	}

	sendSuccess(res, { message: 'REPORT_SENT' }, `user sent report successfully`);
};

export const getPocketAuxiliaryApplications = async (req: Request, res: Response) => {
	const results = getPocketApplications(res.locals.currentUser.id);

	sendSuccess(res, results, `user get submitted auxiliary pioneer application list`);
};

export const submitPocketAuxiliaryApplications = async (req: Request, res: Response) => {
	submitPocketApplication(res.locals.currentUser.id, req.body.application as StandardRecord);

	sendSuccess(res, { message: 'APPLICATION_SENT' }, `user submitted auxiliary pioneer application`);
};

export const deletePocketUser = async (req: Request, res: Response) => {
	await deletePocketAccount(res.locals.currentUser.id);

	sendSuccess(res, { message: 'ACCOUNT_DELETED' }, 'user deleted account successfully');
};

