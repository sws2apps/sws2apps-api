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
	name: string;
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
	cong_name?: string;
	cong_number?: string;
	country_code?: string;
	temp_key?: string;
	request_id: string;
};

export type IncomingSpeakersType = {
	list?: VisitingSpeakerType[];
	speakers_key?: string;
};

export type OutgoingSpeakersRecordType = IncomingSpeakersType & {
	access: OutgoingSpeakersAccessStorageType[];
};

export type CongregationBackupType = {
	last_backup?: string;
	cong_master_key?: string;
	cong_access_code?: string;
	speakers_key?: string;
	cong_settings?: {
		cong_discoverable?: { value: boolean; updatedAt: string };
	};
	cong_persons?: CongregationPersonType[];
	speakers_congregations?: SpeakersCongregationType[];
	visiting_speakers?: VisitingSpeakerType[];
	outgoing_speakers?: VisitingSpeakerType[];
};

export type CongregationPersonType = {
	_deleted: string;
	person_uid: string;
	person_data: {
		person_firstname: string;
		person_lastname: string;
		person_display_name: string;
		male: string;
		female: string;
		birth_date: string;
		assignments: string;
		timeAway: string;
		archived: string;
		disqualified: string;
		email: string;
		address: string;
		phone: string;
		first_month_report: string;
		publisher_baptized: string;
		publisher_unbaptized: string;
		midweek_meeting_student: string;
		privileges: string;
		enrollments: string;
		emergency_contacts: string;
	};
};

export type SpeakersCongregationType = {
	_deleted: string;
	id: string;
	cong_data: {
		cong_id: string;
		cong_number: string;
		cong_name: string;
		cong_circuit: string;
		cong_location: string;
		midweek_meeting: string;
		weekend_meeting: string;
		public_talk_coordinator: string;
		coordinator: string;
		request_status: string;
		request_id: string;
	};
};

export type VisitingSpeakerType = {
	person_uid: string;
	_deleted: string;
	speaker_data: {
		cong_id: string;
		person_firstname: string;
		person_lastname: string;
		person_display_name: string;
		person_notes: string;
		person_email: string;
		person_phone: string;
		elder: string;
		ministerial_servant: string;
		talks: string;
	};
};

export type CongregationRequestPendingType = {
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
	pending_speakers_requests?: CongregationRequestPendingType[];
	remote_congregations?: (OutgoingSpeakersAccessStorageType & IncomingSpeakersType)[];
	rejected_requests?: (OutgoingSpeakersAccessStorageType & IncomingSpeakersType)[];
};
