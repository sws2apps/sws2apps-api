export type AppRoleType =
	| 'admin'
	| 'lmmo'
	| 'lmmo-backup'
	| 'view_meeting_schedule'
	| 'secretary'
	| 'public_talk_coordinator'
	| 'coordinator'
	| 'admin';

export type OTPSecretType = { secret: string; uri: string; version: number };
