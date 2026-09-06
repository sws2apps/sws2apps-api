import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

import {
	bindInstallationToUser,
	deleteUserAccount,
	disableUserMfa,
	getUserActiveSessions,
	getUserMfaEnrollment,
	getValidatedUserAccount,
	logoutUserSession,
	revokeUserSession,
	UserAccountError,
} from '../services/users-account.service.js';

const handleUserAccountError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof UserAccountError)) return false;

	if (error.code === 'USER_NOT_FOUND') {
		sendClientError(res, 404, 'ACCOUNT_NOT_FOUND', 'user account does not exist');
		return true;
	}

	if (error.code === 'SESSION_NOT_FOUND') {
		sendClientError(res, 404, 'SESSION_NOT_FOUND', 'user session does not exist');
		return true;
	}

	const logMessage = error.code === 'CONGREGATION_NOT_ASSIGNED'
		? 'email address not associated with a congregation'
		: 'user congregation is invalid';
	sendClientError(res, 404, 'CONG_NOT_FOUND', logMessage);
	return true;
};

const rethrowUnexpectedAccountError = (error: unknown, res: Response) => {
	if (!handleUserAccountError(error, res)) throw error;
};

export const validateUser = async (req: Request, res: Response) => {
	try {
		const userId = res.locals.currentUser.id;
		const installationId = req.headers.installation as string | undefined;

		await bindInstallationToUser(userId, installationId);

		const account = getValidatedUserAccount(userId);

		sendSuccess(res, account, 'visitor id has been validated');
	} catch (error) {
		rethrowUnexpectedAccountError(error, res);
	}
};

export const getUserSecretToken = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		const enrollment = await getUserMfaEnrollment(id);

		sendSuccess(res, enrollment, 'the user has fetched 2fa successfully');
	} catch (error) {
		rethrowUnexpectedAccountError(error, res);
	}
};

export const getUserSessions = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		const sessions = getUserActiveSessions(id, req.signedCookies.visitorid);

		sendSuccess(res, sessions, `the user has fetched sessions successfully`);
	} catch (error) {
		rethrowUnexpectedAccountError(error, res);
	}
};

export const deleteUserSession = async (req: Request, res: Response) => {
	const { id } = req.params;
	const identifier = req.body.identifier as string;

	try {
		const sessions = await revokeUserSession(id, identifier);

		sendSuccess(res, sessions, `the user has revoked session successfully`);
	} catch (error) {
		rethrowUnexpectedAccountError(error, res);
	}
};

export const userLogout = async (req: Request, res: Response) => {
	const visitorId = req.signedCookies.visitorid as string;

	await logoutUserSession(res.locals.currentUser?.id, visitorId);

	res.clearCookie('visitorid', { path: '/' });
	sendSuccess(res, { message: 'OK' }, 'the current user has logged out');
};

export const disableUser2FA = async (req: Request, res: Response) => {
	const { id } = req.params;

	try {
		await disableUserMfa(id);

		sendSuccess(res, { message: 'MFA_DISABLED' }, `the user disabled 2fa successfully`);
	} catch (error) {
		rethrowUnexpectedAccountError(error, res);
	}
};

export const deleteUser = async (req: Request, res: Response) => {
	const { id } = req.params;

	await deleteUserAccount(id);

	sendSuccess(res, { message: 'ACCOUNT_DELETED' }, 'user deleted account successfully');
};
