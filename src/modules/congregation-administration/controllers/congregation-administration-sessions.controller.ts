import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';

import { revokeCongregationUserSession } from '../services/congregation-administration-users.service.js';
import { handleCongregationUserError } from './congregation-administration-user-errors.js';

export const userSessionDelete = async (req: Request, res: Response) => {
	const { id, user } = req.params;


	if (!id || id === 'undefined') {
		sendClientError(res, 400, 'CONG_ID_INVALID', 'the congregation id params is undefined');

		return;
	}

	if (!user) {
		sendClientError(res, 400, 'error_app_congregation_invalid-id', 'the congregation user params is undefined');

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

	sendSuccess(res, congregationMembers, 'congregation admin terminated user session');
};
