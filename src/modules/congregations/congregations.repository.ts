import { LogLevel } from '@logtail/types';
import type { StandardRecord } from '../../types/standard-record.js';
import {
	CongregationCreateInfoType,
	CongSettingsType,
	OutgoingSpeakersRecordType,
	OutgoingTalkScheduleType,
	UserRequestAccess,
} from './congregations.types.js';
import {
	deleteFileFromStorage,
	getFileFromStorage,
	getFileMetadata,
	listFilesFromStorage,
	uploadFileToStorage,
} from '../../platform/firebase/storage.js';
import { Congregation } from './congregation.js';
import { getCongregationMetadata } from './congregation-metadata.repository.js';
import { logger } from '../../platform/logging/logger.js';
import {
	generateSecureRandomString,
	UPPERCASE_ALPHANUMERIC_CHARACTERS,
} from '../../platform/security/secure-random-string.js';

export const getCongsID = async () => {
	const pattern = '^v3\\/congregations\\/(.+?)\\/';

	const files = await listFilesFromStorage({
		type: 'congregation',
		path: '',
	});

	const draftCongs = files.filter((file) => {
		const rgExp = new RegExp(pattern, 'g');
		return rgExp.test(file.path);
	});

	const formatted = draftCongs.map((file) => {
		const rgExp = new RegExp(pattern, 'g');

		return rgExp.exec(file.path)![1];
	});

	const congs = Array.from(new Set(formatted));

	return congs as string[];
};

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

export const getCongSettings = async (cong_id: string) => {
	const data = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/settings/main.txt` });

	if (!data) {
		logger(LogLevel.Warn, 'congregation settings not found', { service: 'firebase' });
		return;
	}

	const result: CongSettingsType = JSON.parse(data!);
	return result;
};

export const getCongFlags = async (cong_id: string) => {
	const data = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/settings/flags.txt` });

	if (data) {
		const flags = JSON.parse(data) as string[];
		return flags;
	}

	return [];
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

export const getApplications = async (cong_id: string) => {
	const files = await listFilesFromStorage({
		type: 'congregation',
		path: `${cong_id}/auxiliary_applications`,
		pathIncludes: '.txt',
		includeContents: true,
	});

	return files.map((file) => JSON.parse(file.contents!) as StandardRecord);
};

export const getCongDetails = async (cong_id: string) => {
	return {
		createdAt: await getCongCreatedAt(cong_id),
		settings: await getCongSettings(cong_id),
		outgoing_speakers: await getOutgoingSpeakersAccessList(cong_id),
		metadata: await getCongregationMetadata(cong_id),
		flags: await getCongFlags(cong_id),
		join_requests: await getCongJoinRequests(cong_id),
		incoming_reports: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/field_service_reports/incoming.txt` }),
		applications: await getApplications(cong_id),
	};
};

export const loadAllCongs = async (batchSize = 10) => {
	const congs = await getCongsID();
	const result: Congregation[] = [];

	// Process in batches
	for (let i = 0; i < congs.length; i += batchSize) {
		const batch = congs.slice(i, i + batchSize);

		// Run all in parallel for this batch
		const loadedBatch = await Promise.all(
			batch.map(async (record) => {
				const cong = new Congregation(record);
				await cong.loadDetails();
				return cong;
			}),
		);

		result.push(...loadedBatch);
	}

	return result;
};

export const setCongPersons = async (id: string, persons: StandardRecord[]) => {
	for await (const person of persons) {
		const personData = JSON.stringify(person);
		const path = `${id}/persons/${person.person_uid}.txt`;
		await uploadFileToStorage(personData, { type: 'congregation', path });
	}
};

export const setCongSettings = async (id: string, settings: CongSettingsType) => {
	const data = JSON.stringify(settings);
	const path = `${id}/settings/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
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

export const createCongregation = async (data: CongregationCreateInfoType) => {
	const settings: CongSettingsType = {
		country_code: data.country_code,
		country_guid: data.country_guid,
		cong_guid: data.cong_guid,
		cong_prefix: generateSecureRandomString(8, UPPERCASE_ALPHANUMERIC_CHARACTERS),
		cong_name: data.cong_name,
		cong_number: { value: '', updatedAt: '' },
		cong_discoverable: { value: false, updatedAt: new Date().toISOString() },
		data_sync: { value: false, updatedAt: new Date().toISOString() },
		time_away_public: { value: false, updatedAt: new Date().toISOString() },
		cong_location: { ...data.cong_location, updatedAt: new Date().toISOString() },
		cong_circuit: [{ type: 'main', value: data.cong_circuit, updatedAt: new Date().toISOString(), _deleted: false }],
		midweek_meeting: [
			{
				type: 'main',
				_deleted: { value: false, updatedAt: new Date().toISOString() },
				time: { value: data.midweek_meeting.time, updatedAt: new Date().toISOString() },
				weekday: { value: data.midweek_meeting.weekday, updatedAt: new Date().toISOString() },
				aux_class_counselor_default: '',
				class_count: '',
				closing_prayer_auto_assigned: '',
				opening_prayer_auto_assigned: '',
			},
		],
		weekend_meeting: [
			{
				type: 'main',
				_deleted: { value: false, updatedAt: new Date().toISOString() },
				time: { value: data.weekend_meeting.time, updatedAt: new Date().toISOString() },
				weekday: { value: data.weekend_meeting.weekday, updatedAt: new Date().toISOString() },
				consecutive_monthly_parts_notice_shown: '',
				opening_prayer_auto_assigned: '',
				outgoing_talks_schedule_public: '',
				substitute_speaker_enabled: '',
				substitute_w_study_conductor_displayed: '',
				w_study_conductor_default: '',
			},
		],
		attendance_online_record: '',
		circuit_overseer: '',
		cong_access_code: '',
		cong_master_key: '',
		cong_new: true,
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
		week_start_sunday: '',
	};

	const id = crypto.randomUUID().toUpperCase();
	await setCongSettings(id, settings);

	await setCongCreatedAt(id, new Date().toISOString());

	return id;
};

export const saveAPApplication = async (congId: string, application: StandardRecord) => {
	const data = JSON.stringify(application);

	const path = `${congId}/auxiliary_applications/${application.request_id}.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const deleteAPApplication = async (congId: string, requestId: string) => {
	const path = `${congId}/auxiliary_applications/${requestId}.txt`;
	await deleteFileFromStorage({ type: 'congregation', path });
};

export const setIncomingReports = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/field_service_reports/incoming.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setCongFlags = async (id: string, flags: string[]) => {
	const data = JSON.stringify(flags);
	const path = `${id}/settings/flags.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const getCongJoinRequests = async (cong_id: string) => {
	const data = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/users/requests.txt` });

	if (data) {
		const requests = JSON.parse(data) as UserRequestAccess[];
		return requests;
	}

	return [];
};

export const setCongJoinRequests = async (id: string, requests: UserRequestAccess[]) => {
	const data = JSON.stringify(requests);
	const path = `${id}/users/requests.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const getCongCreatedAt = async (cong_id: string) => {
	let createdAt: string | undefined;

	createdAt = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/settings/created.txt` });

	if (!createdAt) {
		const createdAtDefault = await getFileMetadata({ type: 'congregation', path: `${cong_id}/settings/main.txt` });
		createdAt = createdAtDefault?.timeCreated || new Date().toISOString();

		await setCongCreatedAt(cong_id, createdAt!);
	}

	return createdAt;
};

export const setCongCreatedAt = async (id: string, data: string) => {
	const path = `${id}/settings/created.txt`;
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
