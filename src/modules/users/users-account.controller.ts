import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

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

export const validateUser = async (req: Request, res: Response) => {
	try {
		const account = getValidatedUserAccount(res.locals.currentUser.id);

		sendSuccess(res, account, 'visitor id has been validated');
	} catch (error) {
		if (!(error instanceof UserAccountError)) throw error;

		const logMessage = error.code === 'CONGREGATION_NOT_ASSIGNED'
			? 'email address not associated with a congregation'
			: 'user congregation is invalid';
		sendClientError(res, 404, 'CONG_NOT_FOUND', logMessage);
	}
};

export const getUserSecretToken = async (req: Request, res: Response) => {
	const { id } = req.params;

	const enrollment = await getUserMfaEnrollment(id);

	sendSuccess(res, enrollment, 'the user has fetched 2fa successfully');
};

export const getUserSessions = async (req: Request, res: Response) => {
	const { id } = req.params;

	const sessions = getUserActiveSessions(id, req.signedCookies.visitorid);

	sendSuccess(res, sessions, `the user has fetched sessions successfully`);
};

export const deleteUserSession = async (req: Request, res: Response) => {
	const { id } = req.params;
	const identifier = req.body.identifier as string;

	const sessions = await revokeUserSession(id, identifier);

	sendSuccess(res, sessions, `the user has revoked session successfully`);
};

export const userLogout = async (req: Request, res: Response) => {
	const visitorId = req.signedCookies.visitorid as string;

	await logoutUserSession(res.locals.currentUser?.id, visitorId);

	res.clearCookie('visitorid', { path: '/' });
	sendSuccess(res, { message: 'OK' }, 'the current user has logged out');
};

export const disableUser2FA = async (req: Request, res: Response) => {
	const { id } = req.params;

	await disableUserMfa(id);

	sendSuccess(res, { message: 'MFA_DISABLED' }, `the user disabled 2fa successfully`);
};

export const deleteUser = async (req: Request, res: Response) => {
	const { id } = req.params;

	await deleteUserAccount(id);

	sendSuccess(res, { message: 'ACCOUNT_DELETED' }, 'user deleted account successfully');
};
