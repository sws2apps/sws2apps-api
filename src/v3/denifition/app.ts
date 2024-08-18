export type AppRoleType =
	| 'admin'
	| 'coordinator'
	| 'secretary'
	| 'service_overseer'
	| 'field_service_group_overseer'
	| 'midweek_schedule'
	| 'public_talk_schedule'
	| 'attendance_tracking'
	| 'publisher'
	| 'view_schedules';

export type OTPSecretType = { secret: string; uri: string; version: number };
