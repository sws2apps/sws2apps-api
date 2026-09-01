import type { AppRoleType } from '#domain/users/app-role.js';
import type { StandardRecord } from '../../types/standard-record.js';
import type { CongSettingsType } from '#modules/congregations/index.js';

export type BackupData = {
	speakers_key?: string;
	outgoing_talks?: object[];
	app_settings: { cong_settings?: CongSettingsType; user_settings?: object };
	persons: StandardRecord[];
	outgoing_speakers: StandardRecord[];
	speakers_congregations: StandardRecord[];
	visiting_speakers: StandardRecord[];
	branch_cong_analysis: StandardRecord[];
	branch_field_service_reports: StandardRecord[];
	field_service_groups: StandardRecord[];
	meeting_attendance: StandardRecord[];
	sched: StandardRecord[];
	sources: StandardRecord[];
	upcoming_events: StandardRecord[];
	user_bible_studies?: StandardRecord[];
	user_field_service_reports?: StandardRecord[];
	delegated_field_service_reports?: StandardRecord[];
	public_schedules?: StandardRecord[];
	public_sources?: StandardRecord[];
	incoming_reports?: StandardRecord[];
	cong_field_service_reports?: StandardRecord[];
	cong_users?: {
		id: string;
		local_uid?: string;
		role?: AppRoleType[];
	}[];
	metadata: Record<string, string>;
};

export type BackupForStorage = {
	chunks: string[];
	totalChunks: number;
	received: number;
	receivedBytes: number;
	timeout: NodeJS.Timeout;
	userId: string;
	congregationId: string;
};
