import type { NextFunction, Request, Response } from 'express';
import type { AppRoleType } from '#domain/users/app-role.js';

import { hasAnyCongregationRole } from '#http/security/roles.js';
import { sendClientError } from '#http/responses.js';

const denyAccess = (response: Response) => {
	response.locals.failedLoginAttempt = true;
	sendClientError(response, 403, 'UNAUTHORIZED_ACCESS', 'user does not have the required role');
};

/**
 * Requires the authenticated user to hold one of the allowed roles for the
 * congregation identified by the `:id` path parameter. The role is only
 * considered for the caller's own congregation membership, so accessing another
 * congregation's resource is denied even when the caller holds an eligible role
 * on their primary membership.
 */
const requireCongregationRole = (allowedRoles: readonly AppRoleType[]) => {
	return async (request: Request, response: Response, next: NextFunction) => {
		try {
			const membership = response.locals.currentUser?.profile.congregation;

			if (
				!membership ||
				membership.id !== request.params.id ||
				!hasAnyCongregationRole(membership.cong_role, allowedRoles)
			) {
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
