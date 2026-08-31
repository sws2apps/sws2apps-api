import type { Request, Response } from 'express';

import { revokeCongregationUserSession } from './congregation-administration-users.service.js';
import { handleCongregationUserError } from './congregation-administration-user-errors.js';

export const userSessionDelete = async (req: Request, res: Response) => {
	const { id, user } = req.params;


	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation user params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	const identifier = req.body.identifier as string;
	let congregationMembers;
	try {
		congregationMembers = await revokeCongregationUserSession(
			id,
			res.locals.currentUser.id,
			user,
			req.signedCookies.visitorid,
			identifier,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin terminated user session';
	res.status(200).json(congregationMembers);
};

