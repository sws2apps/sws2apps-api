import type { AppRoleType } from '../../v3/definition/app.js';

export const hasAnyCongregationRole = (
	userRoles: readonly AppRoleType[] | undefined,
	allowedRoles: readonly AppRoleType[],
) => {
	if (!userRoles) return false;
	return allowedRoles.some((allowedRole) => userRoles.includes(allowedRole));
};
