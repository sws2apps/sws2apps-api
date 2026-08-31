import type { Request, Response } from 'express';

import { rejectInvalidRequest } from '../../http/validation-errors.js';
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

