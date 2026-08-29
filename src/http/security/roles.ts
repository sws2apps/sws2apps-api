import type { AppRoleType } from '../../domain/users/app-role.js';

export const hasAnyCongregationRole = (
	userRoles: readonly AppRoleType[] | undefined,
	allowedRoles: readonly AppRoleType[],
) => {
	if (!userRoles) return false;
	return allowedRoles.some((allowedRole) => userRoles.includes(allowedRole));
};
