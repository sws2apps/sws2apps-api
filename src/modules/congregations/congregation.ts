import type { StandardRecord } from '../../types/standard-record.js';
import type { User } from '#modules/users/index.js';
import type {
	CongSettingsType,
	CongregationMetadata,
	OutgoingSpeakersRecordType,
	UserRequestAccess,
} from './types/congregations.types.js';

export class Congregation {
	id: string;
	createdAt: string;
	members: User[];
	settings: CongSettingsType;
	outgoing_speakers: OutgoingSpeakersRecordType;
	metadata: CongregationMetadata;
	flags: string[];
	join_requests: UserRequestAccess[];
	ap_applications: StandardRecord[];
	incoming_reports: StandardRecord[];

	constructor(id: string) {
		this.id = id;
		this.createdAt = '';
		this.metadata = {
			persons: '',
			cong_settings: '',
			sources: '',
			schedules: '',
			field_service_groups: '',
			visiting_speakers: '',
			branch_field_service_reports: '',
			branch_cong_analysis: '',
			meeting_attendance: '',
			speakers_congregations: '',
			cong_field_service_reports: '',
			upcoming_events: '',
			incoming_reports: '',
			public_sources: '',
			public_schedules: '',
		};
		this.settings = {
			attendance_online_record: '',
			circuit_overseer: '',
			cong_access_code: '',
			cong_circuit: [{ type: 'main', value: '', updatedAt: '', _deleted: false }],
			cong_discoverable: { value: false, updatedAt: '' },
			cong_location: { lat: undefined, lng: undefined, address: '', updatedAt: '' },
			cong_master_key: '',
			cong_name: '',
			cong_new: true,
			cong_number: { value: '', updatedAt: '' },
			country_code: '',
			country_guid: '',
			cong_guid: '',
			cong_prefix: '',
			display_name_enabled: '',
			format_24h_enabled: '',
			fullname_option: '',
			language_groups: '',
			last_backup: '',
			responsabilities: '',
			schedule_exact_date_enabled: '',
			short_date_format: '',
			source_material_auto_import: '',
			special_months: '',
			time_away_public: { value: false, updatedAt: '' },
			week_start_sunday: '',
			data_sync: { value: false, updatedAt: '' },
			group_publishers_sort: '',
			midweek_meeting: [
				{
					type: 'main',
					_deleted: { value: false, updatedAt: '' },
					weekday: { value: undefined, updatedAt: '' },
					time: { value: '', updatedAt: '' },
					aux_class_counselor_default: '',
					class_count: '',
					closing_prayer_auto_assigned: '',
					opening_prayer_auto_assigned: '',
				},
			],
			weekend_meeting: [
				{
					type: 'main',
					_deleted: { value: false, updatedAt: '' },
					weekday: { value: undefined, updatedAt: '' },
					time: { value: '', updatedAt: '' },
					consecutive_monthly_parts_notice_shown: '',
					opening_prayer_auto_assigned: '',
					outgoing_talks_schedule_public: '',
					substitute_speaker_enabled: '',
					substitute_w_study_conductor_displayed: '',
					w_study_conductor_default: '',
				},
			],
		};
		this.outgoing_speakers = { list: [], speakers_key: '', access: [] };
		this.members = [];
		this.flags = [];
		this.join_requests = [];
		this.ap_applications = [];
		this.incoming_reports = [];
	}
}
