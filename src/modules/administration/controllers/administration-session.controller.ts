import type { Request, Response } from 'express';
import { sendSuccess } from '#http/responses.js';

import { logoutAdministrationUser } from '../services/administration-users.service.js';

export const validateAdmin = async (req: Request, res: Response) => {
	sendSuccess(res, { message: 'OK' }, 'administrator successfully logged in');
};

export const logoutAdmin = async (req: Request, res: Response) => {
	// remove all sessions
	const { id } = res.locals.currentUser;
	await logoutAdministrationUser(id);

	res.clearCookie('visitorid');
	sendSuccess(res, { message: 'LOGGED_OUT' }, 'administrator successfully logged out');
};
