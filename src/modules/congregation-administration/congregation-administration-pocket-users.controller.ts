import type { Request, Response } from 'express';

import { rejectInvalidRequest } from '../../http/validation-errors.js';
import {
	createCongregationPocketUser,
	deleteCongregationUserPocketCode,
} from './congregation-administration-users.service.js';
import { handleCongregationUserError } from './congregation-administration-user-errors.js';

export const pocketUserAdd = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	const { user_firstname, user_lastname, cong_role, cong_person_uid, user_secret_code } = req.body;
	let congregationMembers;
	try {
		congregationMembers = await createCongregationPocketUser(
			id,
			res.locals.currentUser.id,
			req.signedCookies.visitorid,
			{
				firstname: user_firstname,
				lastname: user_lastname,
				roles: cong_role,
				personUid: cong_person_uid,
				secretCode: user_secret_code,
			},
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin added pocket user';
	res.status(200).json(congregationMembers);
};

export const pocketCodeDelete = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

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

	let congregationMembers;
	try {
		congregationMembers = await deleteCongregationUserPocketCode(
			id,
			res.locals.currentUser.id,
			user,
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin deleted user invitation code';
	res.status(200).json(congregationMembers);
};

