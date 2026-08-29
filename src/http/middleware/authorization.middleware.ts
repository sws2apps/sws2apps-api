import type { NextFunction, Request, Response } from 'express';
import type { AppRoleType } from '../../domain/users/app-role.js';

import { hasAnyCongregationRole } from '../security/roles.js';

const denyAccess = (response: Response) => {
	response.locals.type = 'warn';
	response.locals.message = 'user does not have the required role';
	response.locals.failedLoginAttempt = true;
	response.status(403).json({ message: 'UNAUTHORIZED_ACCESS' });
};

const requireCongregationRole = (allowedRoles: readonly AppRoleType[]) => {
	return async (_request: Request, response: Response, next: NextFunction) => {
		try {
			const userRoles = response.locals.currentUser?.profile.congregation?.cong_role;

			if (!hasAnyCongregationRole(userRoles, allowedRoles)) {
				denyAccess(response);
				return;
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

export const requireGlobalAdministrator = () => {
	return async (_request: Request, response: Response, next: NextFunction) => {
		try {
			if (response.locals.currentUser?.profile.role !== 'admin') {
				denyAccess(response);
				return;
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

export const requireCongregationAdministrator = () => {
	return requireCongregationRole(['admin', 'coordinator', 'secretary']);
};

export const requireMeetingEditor = () => {
	return requireCongregationRole([
		'admin',
		'coordinator',
		'midweek_schedule',
		'weekend_schedule',
		'public_talk_schedule',
	]);
};

export const requirePublicTalkCoordinator = () => {
	return requireCongregationRole(['admin', 'public_talk_schedule']);
};
