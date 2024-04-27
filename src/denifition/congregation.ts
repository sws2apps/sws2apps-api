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
	cong_location: { address: string; lat: number; lng: number };
	midweek_meeting: MeetingRecordType[];
	weekend_meeting: MeetingRecordType[];
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
};

export type MeetingRecordType = {
	type: string;
	weekday: number | null;
	time: string;
};
