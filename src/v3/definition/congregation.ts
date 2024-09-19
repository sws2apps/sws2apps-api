import { StandardRecord } from './app.js';

export type CongregationCreateInfoType = {
	country_code: string;
	cong_name: string;
	cong_number: string;
	cong_location: { address: string; lat: number; lng: number };
	cong_circuit: string;
	midweek_meeting: { weekday: number; time: string };
	weekend_meeting: { weekday: number; time: string };
};

export type CongregationRecordType = {
	cong_name: string;
	cong_number: string;
	country_code: string;
	last_backup?: string;
	cong_circuit: CircuitRecordType[];
	cong_location: { address: string; lat: number; lng: number; updatedAt: string };
	midweek_meeting: MeetingRecordType[];
	weekend_meeting: MeetingRecordType[];
	cong_discoverable: { value: boolean; updatedAt: string };
};

export type ApiCongregationSearchResponse = {
	congName: string;
	congNumber: string;
	address: string;
	location: { lat: number; lng: number };
	midweekMeetingTime: { weekday: number; time: string };
	weekendMeetingTime: { weekday: number; time: string };
	circuit: string;
};

export type CircuitRecordType = {
	type: string;
	value: string;
	updatedAt: string;
};

export type MeetingRecordType = {
	type: string;
	weekday: { value: null; updatedAt: string };
	time: { value: string; updatedAt: string };
};

export type OutgoingSpeakersAccessStorageType = {
	cong_id: string;
	status: 'pending' | 'approved' | 'disapproved';
	updatedAt: string;
	key?: string;
	temp_key?: string;
	request_id: string;
};

export type IncomingSpeakersType = {
	list: StandardRecord[];
	speakers_key?: string;
};

export type OutgoingSpeakersRecordType = IncomingSpeakersType & {
	access: OutgoingSpeakersAccessStorageType[];
};

export type CongRequestPendingType = {
	cong_id: string;
	updatedAt: string;
	cong_number: string;
	cong_name: string;
	country_code: string;
	request_id: string;
};

export type CongregationUpdatesType = {
	cong_master_key?: string;
	cong_access_code?: string;
	speakers_key?: string;
	pending_speakers_requests?: CongRequestPendingType[];
	remote_congregations?: (OutgoingSpeakersAccessStorageType & IncomingSpeakersType)[];
	rejected_requests?: (OutgoingSpeakersAccessStorageType & IncomingSpeakersType)[];
};

export type OutgoingTalkScheduleType = {
	_deleted: boolean;
	updatedAt: string;
	id: string;
	recipient: string;
	sender: string;
	weekOf: string;
	synced: boolean;
	opening_song: string;
	public_talk: number;
	speaker: string;
	congregation: {
		name: string;
		number: string;
		country: string;
		address: string;
		weekday: number;
		time: string;
	};
};

export type CongSettingsType = {
	country_code: string;
	cong_number: string;
	cong_name: string;
	cong_master_key: string;
	cong_access_code: string;
	cong_location: { address: string; lat: number | undefined; lng: number | undefined; updatedAt: string };
	cong_new: boolean;
	cong_circuit: { type: string; value: string; updatedAt: string }[];
	cong_discoverable: { value: boolean; updatedAt: string };
	fullname_option: string;
	short_date_format: string;
	display_name_enabled: string;
	schedule_exact_date_enabled: string;
	time_away_public: string;
	source_material_auto_import: string;
	special_months: string;
	midweek_meeting: {
		type: string;
		weekday: { value: number | undefined; updatedAt: string };
		time: { value: string; updatedAt: string };
		class_count: string;
		opening_prayer_auto_assigned: string;
		closing_prayer_auto_assigned: string;
		aux_class_counselor_default: string;
	}[];
	weekend_meeting: {
		type: string;
		weekday: { value: number | undefined; updatedAt: string };
		time: { value: string; updatedAt: string };
		opening_prayer_auto_assigned: string;
		substitute_speaker_enabled: string;
		w_study_conductor_default: string;
		substitute_w_study_conductor_displayed: string;
		consecutive_monthly_parts_notice_shown: string;
		outgoing_talks_schedule_public: string;
	}[];
	circuit_overseer: string;
	language_groups: string;
	format_24h_enabled: string;
	week_start_sunday: string;
	attendance_online_record: string;
	responsabilities: string;
	last_backup: string;
};
