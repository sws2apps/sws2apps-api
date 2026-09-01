import type { StandardRecord } from '../../types/standard-record.js';
import {
	getFileFromStorage,
	listFilesFromStorage,
	uploadFileToStorage,
} from '#platform/firebase/storage.js';
import type {
	OutgoingSpeakersRecordType,
	OutgoingTalkScheduleType,
} from './congregations.types.js';

export const getCongPersons = async (cong_id: string) => {
	const files = await listFilesFromStorage({
		type: 'congregation',
		path: `${cong_id}/persons`,
		includeContents: true,
	});

	return files.map((file) => JSON.parse(file.contents!) as StandardRecord);
};

const congregationDataPaths = {
	publicOutgoingTalks: 'public/outgoing_talks.txt',
	publicIncomingTalks: 'public/incoming_talks.txt',
	publicSources: 'public/sources.txt',
	publicSchedules: 'public/schedules.txt',
	fieldServiceGroups: 'field_service_groups/main.txt',
	fieldServiceReports: 'field_service_reports/main.txt',
	speakersCongregations: 'speakers_congregations/main.txt',
	visitingSpeakers: 'visiting_speakers/main.txt',
	sources: 'sources/main.txt',
	schedules: 'schedules/main.txt',
	meetingAttendance: 'meeting_attendance/main.txt',
	branchCongAnalysis: 'branch_cong_analysis/main.txt',
	branchFieldServiceReports: 'branch_field_service_reports/main.txt',
	upcomingEvents: 'upcoming_events/main.txt',
} as const;

type CongregationDataKey = keyof typeof congregationDataPaths;

type CongregationData = {
	publicOutgoingTalks: OutgoingTalkScheduleType[];
	publicIncomingTalks: OutgoingTalkScheduleType[];
	publicSources: StandardRecord[];
	publicSchedules: StandardRecord[];
	fieldServiceGroups: StandardRecord[];
	fieldServiceReports: StandardRecord[];
	speakersCongregations: StandardRecord[];
	visitingSpeakers: StandardRecord[];
	sources: StandardRecord[];
	schedules: StandardRecord[];
	meetingAttendance: StandardRecord[];
	branchCongAnalysis: StandardRecord[];
	branchFieldServiceReports: StandardRecord[];
	upcomingEvents: StandardRecord[];
};

export const getCongregationData = async <Key extends CongregationDataKey>(
	congregationId: string,
	dataKey: Key,
): Promise<CongregationData[Key]> => {
	const relativePath = congregationDataPaths[dataKey];
	const data = await getFileFromStorage({
		type: 'congregation',
		path: `${congregationId}/${relativePath}`,
	});

	return data && data.length > 0
		? JSON.parse(data) as CongregationData[Key]
		: [];
};

export const getOutgoingSpeakersAccessList = async (congId: string) => {
	const outgoingSpeakers = await getFileFromStorage({ type: 'congregation', path: `${congId}/visiting_speakers/outgoing.txt` });

	const outgoingSpeakersData: OutgoingSpeakersRecordType = outgoingSpeakers
		? JSON.parse(outgoingSpeakers)
		: { list: [], access: [] };

	outgoingSpeakersData.speakers_key = await getFileFromStorage({
		type: 'congregation',
		path: `${congId}/visiting_speakers/key.txt`,
	});

	return outgoingSpeakersData;
};

export const setCongPersons = async (id: string, persons: StandardRecord[]) => {
	for await (const person of persons) {
		const personData = JSON.stringify(person);
		const path = `${id}/persons/${person.person_uid}.txt`;
		await uploadFileToStorage(personData, { type: 'congregation', path });
	}
};

export const setCongSources = async (id: string, sources: StandardRecord[]) => {
	const data = JSON.stringify(sources);
	const path = `${id}/sources/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setCongSchedules = async (id: string, schedules: StandardRecord[]) => {
	const data = JSON.stringify(schedules);
	const path = `${id}/schedules/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setCongFieldServiceGroups = async (id: string, groups: StandardRecord[]) => {
	const data = JSON.stringify(groups);
	const path = `${id}/field_service_groups/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setCongVisitingSpeakers = async (id: string, speakers: StandardRecord[]) => {
	const data = JSON.stringify(speakers);
	const path = `${id}/visiting_speakers/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setCongFieldServiceReports = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/field_service_reports/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setBranchFieldServiceReports = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/branch_field_service_reports/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setBranchCongAnalysis = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/branch_cong_analysis/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setMeetingAttendance = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/meeting_attendance/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setSpeakersCongregations = async (id: string, speakers: StandardRecord[]) => {
	const data = JSON.stringify(speakers);
	const path = `${id}/speakers_congregations/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setCongOutgoingSpeakers = async (id: string, speakers: string) => {
	const path = `${id}/visiting_speakers/outgoing.txt`;

	await uploadFileToStorage(speakers, { type: 'congregation', path });
};

export const setCongPublicSources = async (id: string, speakers: string) => {
	const path = `${id}/public/sources.txt`;
	await uploadFileToStorage(speakers, { type: 'congregation', path });
};

export const setCongPublicSchedules = async (id: string, speakers: string) => {
	const path = `${id}/public/schedules.txt`;
	await uploadFileToStorage(speakers, { type: 'congregation', path });
};

export const setCongPublicOutgoingTalks = async (id: string, speakers: string) => {
	const path = `${id}/public/outgoing_talks.txt`;
	await uploadFileToStorage(speakers, { type: 'congregation', path });
};

export const setCongSpeakersKey = async (id: string, speakers_key: string) => {
	const path = `${id}/visiting_speakers/key.txt`;

	await uploadFileToStorage(speakers_key, { type: 'congregation', path });
};

export const setIncomingReports = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/field_service_reports/incoming.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setPublicIncomingTalks = async (id: string, schedules: OutgoingTalkScheduleType[]) => {
	const data = JSON.stringify(schedules);
	const path = `${id}/public/incoming_talks.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setUpcomingEvents = async (id: string, events: StandardRecord[]) => {
	const data = JSON.stringify(events);
	const path = `${id}/upcoming_events/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};
