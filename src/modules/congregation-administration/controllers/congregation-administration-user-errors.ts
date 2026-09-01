import type { Response } from 'express';
import { sendClientError } from '#http/responses.js';

import { CongregationAdministrationUserError } from '../services/congregation-administration-users.service.js';

export const handleCongregationUserError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof CongregationAdministrationUserError)) return false;

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		sendClientError(res, 404, 'error_app_congregation_not-found', 'no congregation could not be found with the provided id');
		return true;
	}

	if (error.code === 'MEMBERSHIP_REQUIRED') {
		sendClientError(res, 403, 'error_api_unauthorized-request', 'user not authorized to access the provided congregation');
		return true;
	}

	sendClientError(res, 404, 'USER_NOT_FOUND', 'no user could found with the provided id');
	return true;
};
