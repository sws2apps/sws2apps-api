import type { Response } from 'express';

import { CongregationAdministrationUserError } from './congregation-administration-users.service.js';

export const handleCongregationUserError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof CongregationAdministrationUserError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return true;
	}

	if (error.code === 'MEMBERSHIP_REQUIRED') {
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return true;
	}

	res.locals.message = 'no user could found with the provided id';
	res.status(404).json({ message: 'USER_NOT_FOUND' });
	return true;
};

