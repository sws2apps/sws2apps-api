import { getStorage } from 'firebase-admin/storage';
import { StandardRecord } from '../../definition/app.js';
import {
	CongregationCreateInfoType,
	CongSettingsType,
	OutgoingSpeakersRecordType,
	UserRequestAccess,
} from '../../definition/congregation.js';
import { deleteFileFromStorage, getFileFromStorage, getFileMetadata, uploadFileToStorage } from './storage_utils.js';
import { CongregationsList } from '../../classes/Congregations.js';
import { decryptData, encryptData } from '../encryption/encryption.js';
import { Congregation } from '../../classes/Congregation.js';

export const getCongsID = async () => {
	const pattern = '^v3\\/congregations\\/(.+?)\\/';

	const [files] = await getStorage().bucket().getFiles({ prefix: 'v3/congregations' });

	const draftCongs = files.filter((file) => {
		const rgExp = new RegExp(pattern, 'g');
		return rgExp.test(file.name);
	});

	const formatted = draftCongs.map((file) => {
		const rgExp = new RegExp(pattern, 'g');

		return rgExp.exec(file.name)![1];
	});

	const congs = Array.from(new Set(formatted));

	return congs;
};

export const getCongPersons = async (cong_id: string) => {
	const storageBucket = getStorage().bucket();
	const [files] = await storageBucket.getFiles({ prefix: `v3/congregations/${cong_id}/persons` });

	const cong_persons: StandardRecord[] = [];

	for await (const file of files) {
		const contents = await file.download();
		const person = decryptData(contents.toString())!;

		cong_persons.push(JSON.parse(person));
	}

	return cong_persons;
};

export const getCongSettings = async (cong_id: string) => {
	const data = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/settings/main.txt` });

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
	const storageBucket = getStorage().bucket();
	const [files] = await storageBucket.getFiles({ prefix: `v3/congregations/${cong_id}/auxiliary_applications` });

	const applications: StandardRecord[] = [];

	for await (const file of files) {
		if (file.name.includes('.txt')) {
			const contents = await file.download();
			const application = decryptData(contents.toString())!;
			applications.push(JSON.parse(application));
		}
	}

	return applications;
};

export const getCongDetails = async (cong_id: string) => {
	return {
		createdAt: await getCongCreatedAt(cong_id),
		public: {
			meeting_source: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/public/sources.txt` }),
			meeting_schedules: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/public/schedules.txt` }),
			outgoing_talks: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/public/outgoing_talks.txt` }),
		},
		branch_cong_analysis: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/branch_cong_analysis/main.txt` }),
		branch_field_service_reports: await getFileFromStorage({
			type: 'congregation',
			path: `${cong_id}/branch_field_service_reports/main.txt`,
		}),
		field_service_groups: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/field_service_groups/main.txt` }),
		field_service_reports: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/field_service_reports/main.txt` }),
		incoming_reports: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/field_service_reports/incoming.txt` }),
		meeting_attendance: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/meeting_attendance/main.txt` }),
		cong_persons: await getCongPersons(cong_id),
		schedules: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/schedules/main.txt` }),
		settings: await getCongSettings(cong_id),
		sources: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/sources/main.txt` }),
		speakers_congregations: await getFileFromStorage({
			type: 'congregation',
			path: `${cong_id}/speakers_congregations/main.txt`,
		}),
		visiting_speakers: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/visiting_speakers/incoming.txt` }),
		outgoing_speakers: await getOutgoingSpeakersAccessList(cong_id),
		applications: await getApplications(cong_id),
		metadata: await getCongMetadata(cong_id),
		flags: await getCongFlags(cong_id),
		join_requests: await getCongJoinRequests(cong_id),
	};
};

export const getPersonsMetadata = async (cong_id: string) => {
	const storageBucket = getStorage().bucket();
	const [files] = await storageBucket.getFiles({ prefix: `v3/congregations/${cong_id}/persons` });

	const dates: string[] = [];

	for await (const file of files) {
		const updated = file.metadata.updated || '';
		dates.push(updated);
	}

	const updated = dates.sort((a, b) => b.localeCompare(a)).at(0) || '';

	return updated;
};

export const getBranchCongAnalysisMetadata = async (cong_id: string) => {
	const branchCongAnalysis = await getFileMetadata({ type: 'congregation', path: `${cong_id}/branch_cong_analysis/main.txt` });

	return branchCongAnalysis?.updated || '';
};

export const getBranchFieldServiceReportsMetadata = async (cong_id: string) => {
	const branchFieldServiceReports = await getFileMetadata({
		type: 'congregation',
		path: `${cong_id}/branch_field_service_reports/main.txt`,
	});

	return branchFieldServiceReports?.updated || '';
};

export const getFieldServiceGroupsMetadata = async (cong_id: string) => {
	const fieldServiceGroups = await getFileMetadata({
		type: 'congregation',
		path: `${cong_id}/field_service_groups/main.txt`,
	});

	return fieldServiceGroups?.updated || '';
};

export const getFieldServiceReportsMetadata = async (cong_id: string) => {
	const fieldServiceReports = await getFileMetadata({
		type: 'congregation',
		path: `${cong_id}/field_service_reports/main.txt`,
	});

	return fieldServiceReports?.updated || '';
};

export const getMeetingAttendanceMetadata = async (cong_id: string) => {
	const meetingAttendance = await getFileMetadata({ type: 'congregation', path: `${cong_id}/meeting_attendance/main.txt` });

	return meetingAttendance?.updated || '';
};

export const getSchedulesMetadata = async (cong_id: string) => {
	const schedules = await getFileMetadata({ type: 'congregation', path: `${cong_id}/schedules/main.txt` });

	return schedules?.updated || '';
};

export const getSourcesMetadata = async (cong_id: string) => {
	const sources = await getFileMetadata({ type: 'congregation', path: `${cong_id}/sources/main.txt` });

	return sources?.updated || '';
};

export const getSpeakersCongregationsMetadata = async (cong_id: string) => {
	const speakersCongregations = await getFileMetadata({
		type: 'congregation',
		path: `${cong_id}/speakers_congregations/main.txt`,
	});

	return speakersCongregations?.updated || '';
};

export const getVisitingSpeakersMetadata = async (cong_id: string) => {
	const visitingSpeakers = await getFileMetadata({ type: 'congregation', path: `${cong_id}/visiting_speakers/main.txt` });

	return visitingSpeakers?.updated || '';
};

export const getSettingsMetadata = async (cong_id: string) => {
	const settings = await getFileMetadata({ type: 'congregation', path: `${cong_id}/settings/main.txt` });

	return settings?.updated || '';
};

export const getIncomingReportsMetadata = async (cong_id: string) => {
	const incomingReports = await getFileMetadata({ type: 'congregation', path: `${cong_id}/field_service_reports/incoming.txt` });

	return incomingReports?.updated || '';
};

export const getPublicSourcesMetadata = async (cong_id: string) => {
	const publicSources = await getFileMetadata({ type: 'congregation', path: `${cong_id}/public/sources.txt` });

	return publicSources?.updated || '';
};

export const getPublicSchedulesMetadata = async (cong_id: string) => {
	const publicSchedules = await getFileMetadata({ type: 'congregation', path: `${cong_id}/public/schedules.txt` });

	return publicSchedules?.updated || '';
};

const getCongMetadata = async (cong_id: string) => {
	return {
		branch_cong_analysis: await getBranchCongAnalysisMetadata(cong_id),
		branch_field_service_reports: await getBranchFieldServiceReportsMetadata(cong_id),
		field_service_groups: await getFieldServiceGroupsMetadata(cong_id),
		cong_field_service_reports: await getFieldServiceReportsMetadata(cong_id),
		meeting_attendance: await getMeetingAttendanceMetadata(cong_id),
		persons: await getPersonsMetadata(cong_id),
		schedules: await getSchedulesMetadata(cong_id),
		cong_settings: await getSettingsMetadata(cong_id),
		sources: await getSourcesMetadata(cong_id),
		speakers_congregations: await getSpeakersCongregationsMetadata(cong_id),
		visiting_speakers: await getVisitingSpeakersMetadata(cong_id),
		incoming_reports: await getIncomingReportsMetadata(cong_id),
		public_sources: await getPublicSourcesMetadata(cong_id),
		public_schedules: await getPublicSchedulesMetadata(cong_id),
	};
};

export const loadAllCongs = async () => {
	const congs = await getCongsID();

	const result: Congregation[] = [];

	for await (const record of congs) {
		const cong = new Congregation(record);
		await cong.loadDetails();

		result.push(cong);
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
		cong_number: data.cong_number,
		cong_name: data.cong_name,
		cong_discoverable: { value: false, updatedAt: new Date().toISOString() },
		data_sync: { value: false, updatedAt: new Date().toISOString() },
		time_away_public: { value: false, updatedAt: new Date().toISOString() },
		cong_location: { ...data.cong_location, updatedAt: new Date().toISOString() },
		cong_circuit: [{ type: 'main', value: data.cong_circuit, updatedAt: new Date().toISOString() }],
		midweek_meeting: [
			{
				type: 'main',
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

export const requestCongAccess = async (congId: string, requestCongId: string, key: string, requestId: string) => {
	const requestCong = CongregationsList.findById(requestCongId)!;

	requestCong.outgoing_speakers.access = requestCong.outgoing_speakers.access.filter((record) => record.cong_id !== congId);

	requestCong.outgoing_speakers.access.push({
		cong_id: congId,
		key: '',
		status: 'pending',
		updatedAt: new Date().toISOString(),
		temp_key: key,
		request_id: requestId,
	});

	const data = JSON.stringify({
		list: requestCong.outgoing_speakers.list,
		access: requestCong.outgoing_speakers.access,
	});

	await setCongOutgoingSpeakers(congId, data);
};

export const approveCongAccess = async (congId: string, request_id: string, speakers_key: string) => {
	const cong = CongregationsList.findById(congId)!;

	const request = cong.outgoing_speakers.access.find((record) => record.request_id === request_id)!;

	request.key = encryptData(JSON.stringify(speakers_key), request.temp_key);
	request.status = 'approved';
	request.updatedAt = new Date().toISOString();

	delete request.temp_key;

	const data = JSON.stringify({
		list: cong.outgoing_speakers.list,
		access: cong.outgoing_speakers.access,
	});

	await setCongOutgoingSpeakers(congId, data);
};

export const rejectCongAccess = async (congId: string, requestId: string) => {
	const cong = CongregationsList.findById(congId)!;

	const request = cong.outgoing_speakers.access.find((record) => record.request_id === requestId)!;

	request.status = 'disapproved';
	request.updatedAt = new Date().toISOString();

	if (request.temp_key) delete request.temp_key;

	const data = JSON.stringify({
		list: cong.outgoing_speakers.list,
		access: cong.outgoing_speakers.access,
	});

	await setCongOutgoingSpeakers(congId, data);
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
	const createdAt = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/settings/created.txt` });
	const createdAtDefault = await getFileMetadata({ type: 'congregation', path: `${cong_id}/settings/main.txt` });

	return createdAt || createdAtDefault?.timeCreated || '';
};

export const setCongCreatedAt = async (id: string, data: string) => {
	const path = `${id}/settings/created.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};
