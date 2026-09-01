import type { StandardRecord } from '../../types/standard-record.js';
import {
	CongSettingsType,
	OutgoingSpeakersRecordType,
	OutgoingTalkScheduleType,
	UserRequestAccess,
} from './types/congregations.types.js';
import {
	getBranchCongAnalysisMetadata,
	getBranchFieldServiceReportsMetadata,
	getFieldServiceGroupsMetadata,
	getFieldServiceReportsMetadata,
	getIncomingReportsMetadata,
	getMeetingAttendanceMetadata,
	getPersonsMetadata,
	getSchedulesMetadata,
	getSettingsMetadata,
	getSourcesMetadata,
	getSpeakersCongregationsMetadata,
	getUpcomingEventsMetadata,
	getVisitingSpeakersMetadata,
} from './repositories/congregation-metadata.repository.js';
import {
	getCongPersons,
	getCongregationData,
	setBranchCongAnalysis,
	setBranchFieldServiceReports,
	setCongFieldServiceGroups,
	setCongFieldServiceReports,
	setCongOutgoingSpeakers,
	setCongPersons,
	setPublicIncomingTalks,
	setCongSchedules,
	setCongSources,
	setCongSpeakersKey,
	setCongVisitingSpeakers,
	setIncomingReports,
	setMeetingAttendance,
	setSpeakersCongregations,
	setUpcomingEvents,
} from './repositories/congregation-data.repository.js';
import {
	getCongregationDetails,
} from './repositories/congregation-lifecycle.repository.js';
import {
	setCongregationSettings,
} from './repositories/congregation-settings.repository.js';
import { User } from '#modules/users/index.js';

export class Congregation {
	id: string;
	createdAt: string;
	members: User[];
	settings: CongSettingsType;
	outgoing_speakers: OutgoingSpeakersRecordType;
	metadata: Record<string, string>;
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

	async loadDetails() {
		const data = await getCongregationDetails(this.id);

		this.createdAt = data.createdAt || '';
		this.metadata = data.metadata;

		this.outgoing_speakers = data.outgoing_speakers;
		this.flags = data.flags;
		this.join_requests = data.join_requests;
		this.ap_applications = data.applications;

		if (data.settings) {
			this.settings = data.settings;
		}

		if (data.incoming_reports) {
			this.incoming_reports = JSON.parse(data.incoming_reports);
		}

	}

	async savePersons(persons: StandardRecord[]) {
		await setCongPersons(this.id, persons);
		this.metadata.persons = await getPersonsMetadata(this.id);
	}

	async getPersons() {
		return getCongPersons(this.id);
	}

	async saveSettings(settings: CongSettingsType) {
		await setCongregationSettings(this.id, settings);
		this.settings = settings;
		this.metadata.cong_settings = await getSettingsMetadata(this.id);
	}

	async saveSources(sources: StandardRecord[]) {
		await setCongSources(this.id, sources);
		this.metadata.sources = await getSourcesMetadata(this.id);
	}

	async saveSchedules(schedules: StandardRecord[]) {
		await setCongSchedules(this.id, schedules);
		this.metadata.schedules = await getSchedulesMetadata(this.id);
	}

	async saveFieldServiceReports(reports: StandardRecord[]) {
		await setCongFieldServiceReports(this.id, reports);
		this.metadata.cong_field_service_reports = await getFieldServiceReportsMetadata(this.id);
	}

	async saveFieldServiceGroups(groups: StandardRecord[]) {
		await setCongFieldServiceGroups(this.id, groups);
		this.metadata.field_service_groups = await getFieldServiceGroupsMetadata(this.id);
	}

	async saveVisitingSpeakers(speakers: StandardRecord[]) {
		await setCongVisitingSpeakers(this.id, speakers);
		this.metadata.visiting_speakers = await getVisitingSpeakersMetadata(this.id);
	}

	async saveBranchFieldServiceReports(reports: StandardRecord[]) {
		await setBranchFieldServiceReports(this.id, reports);
		this.metadata.branch_field_service_reports = await getBranchFieldServiceReportsMetadata(this.id);
	}

	async saveBranchCongAnalysis(reports: StandardRecord[]) {
		await setBranchCongAnalysis(this.id, reports);
		this.metadata.branch_cong_analysis = await getBranchCongAnalysisMetadata(this.id);
	}

	async saveMeetingAttendance(reports: StandardRecord[]) {
		await setMeetingAttendance(this.id, reports);
		this.metadata.meeting_attendance = await getMeetingAttendanceMetadata(this.id);
	}

	async saveSpeakersCongregations(congregations: StandardRecord[]) {
		await setSpeakersCongregations(this.id, congregations);
		this.metadata.speakers_congregations = await getSpeakersCongregationsMetadata(this.id);
	}

	async saveSpeakersKey(key: string) {
		await setCongSpeakersKey(this.id, key);
		this.outgoing_speakers.speakers_key = key;
	}

	async saveOutgoingSpeakers(speakers: StandardRecord[]) {
		const outgoingData = {
			list: speakers,
			access: this.outgoing_speakers.access,
		};

		await setCongOutgoingSpeakers(this.id, JSON.stringify(outgoingData));

		this.outgoing_speakers.list = speakers;
	}

	async saveIncomingReports(reports: StandardRecord[]) {
		await setIncomingReports(this.id, reports);
		this.incoming_reports = reports;
		this.metadata.incoming_reports = await getIncomingReportsMetadata(this.id);
	}

	async saveUpcomingEvents(events: StandardRecord[]) {
		await setUpcomingEvents(this.id, events);
		this.metadata.upcoming_events = await getUpcomingEventsMetadata(this.id);
	}

	async getPublicOutgoingTalks(): Promise<OutgoingTalkScheduleType[]> {
		return getCongregationData(this.id, 'publicOutgoingTalks');
	}

	async getPublicIncomingTalks(): Promise<OutgoingTalkScheduleType[]> {
		return getCongregationData(this.id, 'publicIncomingTalks');
	}

	async savePublicIncomingTalks(schedules: OutgoingTalkScheduleType[]) {
		await setPublicIncomingTalks(this.id, schedules);
	}

	async getPublicSources() {
		return getCongregationData(this.id, 'publicSources');
	}

	async getPublicSchedules() {
		return getCongregationData(this.id, 'publicSchedules');
	}

	async getFieldServiceGroups() {
		return getCongregationData(this.id, 'fieldServiceGroups');
	}

	async getFieldServiceReports(): Promise<StandardRecord[]> {
		return getCongregationData(this.id, 'fieldServiceReports');
	}

	async getSpeakersCongregations(): Promise<StandardRecord[]> {
		return getCongregationData(this.id, 'speakersCongregations');
	}

	async getVisitingSpeakers(): Promise<StandardRecord[]> {
		return getCongregationData(this.id, 'visitingSpeakers');
	}

	async getSources(): Promise<StandardRecord[]> {
		return getCongregationData(this.id, 'sources');
	}

	async getSchedules(): Promise<StandardRecord[]> {
		return getCongregationData(this.id, 'schedules');
	}

	async getMeetingAttendance(): Promise<StandardRecord[]> {
		return getCongregationData(this.id, 'meetingAttendance');
	}

	async getBranchCongAnalysis(): Promise<StandardRecord[]> {
		return getCongregationData(this.id, 'branchCongAnalysis');
	}

	async getBranchFieldServiceReports(): Promise<StandardRecord[]> {
		return getCongregationData(this.id, 'branchFieldServiceReports');
	}

	async getUpcomingEvents(): Promise<StandardRecord[]> {
		return getCongregationData(this.id, 'upcomingEvents');
	}
}
