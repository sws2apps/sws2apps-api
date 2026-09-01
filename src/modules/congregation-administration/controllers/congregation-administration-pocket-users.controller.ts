import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

import {
	createCongregationPocketUser,
	deleteCongregationUserPocketCode,
} from '../services/congregation-administration-users.service.js';
import { handleCongregationUserError } from './congregation-administration-user-errors.js';

export const pocketUserAdd = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation id params is undefined');

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

	sendSuccess(res, congregationMembers, 'congregation admin added pocket user');
};

export const pocketCodeDelete = async (req: Request, res: Response) => {
	const { id, user } = req.params;

	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'CONG_ID_INVALID', 'the congregation id params is undefined');

		return;
	}

	if (!user) {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation user params is undefined');

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

	sendSuccess(res, congregationMembers, 'congregation admin deleted user invitation code');
};
