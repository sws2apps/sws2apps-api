import { getStorage } from 'firebase-admin/storage';
import { StorageBaseType } from '../../denifition/firebase.js';
import { CongregationPersonType, SpeakersCongregationType, VisitingSpeakerType } from '../../denifition/congregation.js';
import { decryptData, encryptData } from '../encryption/encryption.js';

export const uploadFileToStorage = async (data: string, options: StorageBaseType) => {
	const { congId, filename } = options;

	const destinationFilename = `v3/${congId}/${filename}`;

	const storageBucket = getStorage().bucket();
	const file = storageBucket.file(destinationFilename);

	const encryptedData = encryptData(data);

	await file.save(encryptedData, { metadata: { contentType: 'text/plain' } });

	return encryptedData;
};

export const getFileFromStorage = async (params: StorageBaseType) => {
	let data = '';

	const { congId, filename } = params;

	const destinationFilename = `v3/${congId}/${filename}`;

	const storageBucket = getStorage().bucket();
	const file = await storageBucket.file(destinationFilename);
	const [fileExist] = await file.exists();

	if (fileExist) {
		const contents = await file.download();
		const encryptedData = contents.toString();

		data = decryptData(encryptedData);
	}

	return data;
};

export const getCongregationPersons = async (cong_id: string) => {
	const storageBucket = getStorage().bucket();
	const tmpData = await storageBucket.getFiles({ prefix: `v3/${cong_id}/cong_persons` });
	const userData = tmpData[0];

	const cong_persons: CongregationPersonType[] = [];

	for await (const file of userData) {
		const isPersonData = file.name.indexOf('/person_data.txt') !== -1;

		if (isPersonData) {
			const contents = await file.download();
			const person = decryptData(contents.toString());

			cong_persons.push(JSON.parse(person));
		}
	}

	return cong_persons;
};

export const getSpeakersCongregations = async (cong_id: string) => {
	const tmpData = await getFileFromStorage({ congId: cong_id, filename: 'speakers_congregations.txt' });

	const spkears_congregations: SpeakersCongregationType[] = tmpData.length === 0 ? [] : JSON.parse(tmpData);
	return spkears_congregations;
};

export const getVisitingSpeakers = async (cong_id: string) => {
	const tmpData = await getFileFromStorage({ congId: cong_id, filename: 'visiting_speakers.txt' });

	const visiting_speakers: VisitingSpeakerType[] = tmpData.length === 0 ? [] : JSON.parse(tmpData);
	return visiting_speakers;
};

export const getPublicMeetingSources = async (cong_id: string) => {
	const tmpData = await getFileFromStorage({ congId: cong_id, filename: 'public_meeting_sources.txt' });
	return tmpData;
};

export const getPublicMeetingSchedules = async (cong_id: string) => {
	const tmpData = await getFileFromStorage({ congId: cong_id, filename: 'public_meeting_schedules.txt' });
	return tmpData;
};

export const getPublicOutgoingTalks = async (cong_id: string) => {
	const tmpData = await getFileFromStorage({ congId: cong_id, filename: 'public_outgoing_talks.txt' });
	return tmpData;
};
