import type { Request, Response } from 'express';

import { logoutAdministrationUser } from './administration-users.service.js';

export const validateAdmin = async (req: Request, res: Response) => {
	res.locals.type = 'info';
	res.locals.message = 'administrator successfully logged in';
	res.status(200).json({ message: 'OK' });
};

export const logoutAdmin = async (req: Request, res: Response) => {
	// remove all sessions
	const { id } = res.locals.currentUser;
	await logoutAdministrationUser(id);

	res.locals.type = 'info';
	res.locals.message = 'administrator successfully logged out';

	res.clearCookie('visitorid');
	res.status(200).json({ message: 'LOGGED_OUT' });
};

