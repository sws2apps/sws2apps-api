export type AppRoleType =
	| 'admin'
	| 'coordinator'
	| 'secretary'
	| 'service_overseer'
	| 'field_service_group_overseer'
	| 'midweek_schedule'
	| 'weekend_schedule'
	| 'public_talk_schedule'
	| 'attendance_tracking'
	| 'publisher'
	| 'view_schedules'
	| 'elder';

export type OTPSecretType = { secret: string; uri: string; version: number };

export type StandardRecord = Record<string, unknown>;

export type Translation = {
	[key: string]: {
		[key: string]: string;
	};
};

export type Country = {
	countryGuid: string;
	countryCode: string;
	countryName: string;
};
