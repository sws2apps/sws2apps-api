import { APP_ROLES, type AppRoleType } from '#domain/users/app-role.js';

const allowedCongregationRoles = new Set<AppRoleType>(APP_ROLES);

export const isValidCongregationRoleList = (roles: unknown) => {
	if (!Array.isArray(roles) || roles.length === 0) return false;
	return roles.every((role) => typeof role === 'string' && allowedCongregationRoles.has(role as AppRoleType));
};
