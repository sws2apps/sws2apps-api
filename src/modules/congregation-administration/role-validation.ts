import type { AppRoleType } from '../../v3/definition/app.js';

const allowedCongregationRoles = new Set<AppRoleType>([
	'admin',
	'coordinator',
	'secretary',
	'service_overseer',
	'field_service_group_overseer',
	'midweek_schedule',
	'weekend_schedule',
	'public_talk_schedule',
	'attendance_tracking',
	'publisher',
	'view_schedules',
	'elder',
	'group_overseers',
	'language_group_overseers',
	'duties_schedule',
]);

export const isValidCongregationRoleList = (roles: unknown) => {
	if (!Array.isArray(roles) || roles.length === 0) return false;
	return roles.every((role) => typeof role === 'string' && allowedCongregationRoles.has(role as AppRoleType));
};
