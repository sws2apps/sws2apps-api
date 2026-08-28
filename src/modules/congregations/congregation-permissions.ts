import type { AppRoleType } from '../../v3/definition/app.js';

const applicationManagerRoles: readonly AppRoleType[] = ['admin', 'coordinator', 'secretary', 'service_overseer'];

export const canManageCongregationApplications = (roles: readonly AppRoleType[]) => {
	return applicationManagerRoles.some((managerRole) => roles.includes(managerRole));
};
