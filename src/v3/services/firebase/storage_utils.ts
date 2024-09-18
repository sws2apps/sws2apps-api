import { getStorage } from 'firebase-admin/storage';
import { StorageBaseType } from '../../denifition/firebase.js';
import { CongSettingsType } from '../../denifition/congregation.js';
import { decryptData, encryptData } from '../encryption/encryption.js';
import { StandardRecord } from '../../denifition/app.js';

export const uploadFileToStorage = async (data: string, options: StorageBaseType) => {
	const { path, type } = options;

	let destPath = 'v3/';

	if (type === 'congregation') {
		destPath += `congregations/${path}`;
	}

	if (type === 'user') {
		destPath += `users/${path}`;
	}

	const storageBucket = getStorage().bucket();
	const file = storageBucket.file(destPath);

	const encryptedData = encryptData(data);

	await file.save(encryptedData, { metadata: { contentType: 'text/plain' } });

	return encryptedData;
};

export const getFileFromStorage = async ({ path, type }: StorageBaseType) => {
	let destPath = 'v3/';

	if (type === 'congregation') {
		destPath += `congregations/${path}`;
	}

	if (type === 'user') {
		destPath += `users/${path}`;
	}

	const storageBucket = getStorage().bucket();
	const file = await storageBucket.file(destPath);
	const [fileExist] = await file.exists();

	if (fileExist) {
		const contents = await file.download();
		const encryptedData = contents.toString();

		return decryptData(encryptedData);
	}
};

export const getCongPersons = async (cong_id: string) => {
	const storageBucket = getStorage().bucket();
	const tmpData = await storageBucket.getFiles({ prefix: `v3/congregations/${cong_id}/persons` });
	const userData = tmpData[0];

	const cong_persons: StandardRecord[] = [];

	for await (const file of userData) {
		const contents = await file.download();
		const person = decryptData(contents.toString());

		cong_persons.push(JSON.parse(person));
	}

	return cong_persons;
};

export const getCongSettings = async (cong_id: string) => {
	const data = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/settings/main.txt` });

	if (data) {
		const result: CongSettingsType = JSON.parse(data);
		return result;
	}
};

export const getCongregationData = async (cong_id: string) => {
	return {
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
		meeting_attendance: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/meeting_attendance/main.txt` }),
		cong_persons: await getCongPersons(cong_id),
		schedules: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/schedules/main.txt` }),
		settings: await getCongSettings(cong_id),
		sources: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/sources/main.txt` }),
		speakers_congregations: await getFileFromStorage({
			type: 'congregation',
			path: `${cong_id}/speakers_congregations/main.txt`,
		}),
		visiting_speakers: await getFileFromStorage({ type: 'congregation', path: `${cong_id}/visiting_speakers/main.txt` }),
	};
};
