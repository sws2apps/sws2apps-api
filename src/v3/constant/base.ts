import { AppRoleType } from '../definition/app.js';

export const ROLE_MASTER_KEY: AppRoleType[] = [
	'admin',
	'midweek_schedule',
	'weekend_schedule',
	'public_talk_schedule',
	'secretary',
	'coordinator',
	'elder',
	'service_overseer',
	'group_overseers',
	'language_group_overseers',
];

export const BACKUP_EXPIRY = 2 * 60 * 1000;
