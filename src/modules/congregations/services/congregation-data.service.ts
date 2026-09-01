import { saveAndRefresh } from '#domain/persistence/save-and-refresh.js';
import type { StandardRecord } from '../../../types/standard-record.js';
import type { Congregation } from '../congregation.js';
import type {
	CongSettingsType,
	OutgoingTalkScheduleType,
} from '../types/congregations.types.js';
import {
	getCongPersons,
	getCongregationData,
	setBranchCongAnalysis,
	setBranchFieldServiceReports,
	setCongFieldServiceGroups,
	setCongFieldServiceReports,
	setCongOutgoingSpeakers,
	setCongPersons,
	setCongSchedules,
	setCongSources,
	setCongSpeakersKey,
	setCongVisitingSpeakers,
	setIncomingReports,
	setMeetingAttendance,
	setPublicIncomingTalks,
	setSpeakersCongregations,
	setUpcomingEvents,
} from '../repositories/congregation-data.repository.js';
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
} from '../repositories/congregation-metadata.repository.js';
import { setCongregationSettings } from '../repositories/congregation-settings.repository.js';

type MetadataKey = keyof Congregation['metadata'];

const saveCongregationData = async (
	congregation: Congregation,
	save: () => Promise<void>,
	metadataKey: MetadataKey,
	getMetadata: (congregationId: string) => Promise<string>,
	updateLocalState?: () => void,
) => {
	await saveAndRefresh({
		save,
		updateLocalState,
		refreshMetadata: async () => {
			congregation.metadata[metadataKey] = await getMetadata(congregation.id);
		},
	});
};

export const saveCongregationPersons = (congregation: Congregation, persons: StandardRecord[]) => {
	return saveCongregationData(
		congregation,
		() => setCongPersons(congregation.id, persons),
		'persons',
		getPersonsMetadata,
	);
};

export const getCongregationPersons = (congregationId: string) => {
	return getCongPersons(congregationId);
};

export const saveCongregationSettings = (congregation: Congregation, settings: CongSettingsType) => {
	return saveCongregationData(
		congregation,
		() => setCongregationSettings(congregation.id, settings),
		'cong_settings',
		getSettingsMetadata,
		() => {
			congregation.settings = settings;
		},
	);
};

const standardDataOperations = {
	sources: [setCongSources, getSourcesMetadata],
	schedules: [setCongSchedules, getSchedulesMetadata],
	field_service_groups: [setCongFieldServiceGroups, getFieldServiceGroupsMetadata],
	visiting_speakers: [setCongVisitingSpeakers, getVisitingSpeakersMetadata],
	cong_field_service_reports: [setCongFieldServiceReports, getFieldServiceReportsMetadata],
	branch_field_service_reports: [setBranchFieldServiceReports, getBranchFieldServiceReportsMetadata],
	branch_cong_analysis: [setBranchCongAnalysis, getBranchCongAnalysisMetadata],
	meeting_attendance: [setMeetingAttendance, getMeetingAttendanceMetadata],
	speakers_congregations: [setSpeakersCongregations, getSpeakersCongregationsMetadata],
	upcoming_events: [setUpcomingEvents, getUpcomingEventsMetadata],
} as const;

type StandardDataKey = keyof typeof standardDataOperations;

export const saveCongregationStandardData = (
	congregation: Congregation,
	dataKey: StandardDataKey,
	records: StandardRecord[],
) => {
	const [save, getMetadata] = standardDataOperations[dataKey];
	return saveCongregationData(
		congregation,
		() => save(congregation.id, records),
		dataKey,
		getMetadata,
	);
};

export const saveCongregationSpeakersKey = async (congregation: Congregation, key: string) => {
	await setCongSpeakersKey(congregation.id, key);
	congregation.outgoing_speakers.speakers_key = key;
};

export const saveCongregationOutgoingSpeakers = async (
	congregation: Congregation,
	speakers: StandardRecord[],
) => {
	const outgoingData = {
		list: speakers,
		access: congregation.outgoing_speakers.access,
	};

	await setCongOutgoingSpeakers(congregation.id, JSON.stringify(outgoingData));
	congregation.outgoing_speakers.list = speakers;
};

export const saveCongregationIncomingReports = (congregation: Congregation, reports: StandardRecord[]) => {
	return saveCongregationData(
		congregation,
		() => setIncomingReports(congregation.id, reports),
		'incoming_reports',
		getIncomingReportsMetadata,
		() => {
			congregation.incoming_reports = reports;
		},
	);
};

export const saveCongregationPublicIncomingTalks = (
	congregationId: string,
	schedules: OutgoingTalkScheduleType[],
) => {
	return setPublicIncomingTalks(congregationId, schedules);
};

export const getPublicOutgoingTalks = (congregationId: string) =>
	getCongregationData(congregationId, 'publicOutgoingTalks');
export const getPublicIncomingTalks = (congregationId: string) =>
	getCongregationData(congregationId, 'publicIncomingTalks');
export const getPublicSources = (congregationId: string) =>
	getCongregationData(congregationId, 'publicSources');
export const getPublicSchedules = (congregationId: string) =>
	getCongregationData(congregationId, 'publicSchedules');
export const getFieldServiceGroups = (congregationId: string) =>
	getCongregationData(congregationId, 'fieldServiceGroups');
export const getFieldServiceReports = (congregationId: string) =>
	getCongregationData(congregationId, 'fieldServiceReports');
export const getSpeakersCongregations = (congregationId: string) =>
	getCongregationData(congregationId, 'speakersCongregations');
export const getVisitingSpeakers = (congregationId: string) =>
	getCongregationData(congregationId, 'visitingSpeakers');
export const getSources = (congregationId: string) =>
	getCongregationData(congregationId, 'sources');
export const getSchedules = (congregationId: string) =>
	getCongregationData(congregationId, 'schedules');
export const getMeetingAttendance = (congregationId: string) =>
	getCongregationData(congregationId, 'meetingAttendance');
export const getBranchCongAnalysis = (congregationId: string) =>
	getCongregationData(congregationId, 'branchCongAnalysis');
export const getBranchFieldServiceReports = (congregationId: string) =>
	getCongregationData(congregationId, 'branchFieldServiceReports');
export const getUpcomingEvents = (congregationId: string) =>
	getCongregationData(congregationId, 'upcomingEvents');
