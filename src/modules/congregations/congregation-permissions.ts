import type { AppRoleType } from '#domain/users/app-role.js';

const applicationManagerRoles: readonly AppRoleType[] = ['admin', 'coordinator', 'secretary', 'service_overseer'];

export const canManageCongregationApplications = (roles: readonly AppRoleType[]) => {
	return applicationManagerRoles.some((managerRole) => roles.includes(managerRole));
};
