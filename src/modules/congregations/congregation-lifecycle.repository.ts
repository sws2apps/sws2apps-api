import {
	deleteFileFromStorage,
	getFileFromStorage,
	listFilesFromStorage,
} from '../../platform/firebase/storage.js';
import {
	generateSecureRandomString,
	UPPERCASE_ALPHANUMERIC_CHARACTERS,
} from '../../platform/security/secure-random-string.js';
import { Congregation } from './congregation.js';
import { getCongregationApplications } from './congregation-applications.repository.js';
import {
	getOutgoingSpeakersAccessList,
} from './congregation-data.repository.js';
import {
	getCongregationJoinRequests,
} from './congregation-join-requests.repository.js';
import { getCongregationMetadata } from './congregation-metadata.repository.js';
import {
	getCongregationCreatedAt,
	getCongregationFlags,
	getCongregationSettings,
	setCongregationCreatedAt,
	setCongregationSettings,
} from './congregation-settings.repository.js';
import type {
	CongregationCreateInfoType,
	CongSettingsType,
} from './congregations.types.js';

export const deletePersistedCongregation = async (
	congregationId: string,
): Promise<void> => {
	await deleteFileFromStorage({
		type: 'congregation',
		path: congregationId,
	});
};

export const getCongregationIds = async () => {
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

export const getCongregationDetails = async (cong_id: string) => {
	return {
		createdAt: await getCongregationCreatedAt(cong_id),
		settings: await getCongregationSettings(cong_id),
		outgoing_speakers: await getOutgoingSpeakersAccessList(cong_id),
		metadata: await getCongregationMetadata(cong_id),
		flags: await getCongregationFlags(cong_id),
		join_requests: await getCongregationJoinRequests(cong_id),
		incoming_reports: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/field_service_reports/incoming.txt` }),
		applications: await getCongregationApplications(cong_id),
	};
};

export const loadAllCongregations = async (batchSize = 10) => {
	const congs = await getCongregationIds();
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

export const createPersistedCongregation = async (data: CongregationCreateInfoType) => {
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
	await setCongregationSettings(id, settings);

	await setCongregationCreatedAt(id, new Date().toISOString());

	return id;
};
