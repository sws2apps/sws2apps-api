import { getFirestore } from 'firebase-admin/firestore';
import {
	getCongregationPersons,
	getFileFromStorage,
	getSpeakersCongregations,
	getVisitingSpeakers,
	uploadFileToStorage,
} from './storage_utils.js';
import {
	CongregationBackupType,
	CongregationCreateInfoType,
	CongregationRecordType,
	OutgoingSpeakersAccessStorageType,
	OutgoingSpeakersRecordType,
} from '../../denifition/congregation.js';
import { CongregationsList } from '../../classes/Congregations.js';
import { StorageCongregation } from '../../denifition/firebase.js';

const db = getFirestore(); //get default database

export const dbCongregationDetails = async (congId: string) => {
	const congRef = db.collection('congregations').doc(congId);
	const congSnapshot = await congRef.get();
	const congRecord = congSnapshot.data() as CongregationRecordType;

	return congRecord;
};

const dbGetOutgoingSpeakersAccessList = async (congId: string) => {
	const outgoingSpeakers = await getFileFromStorage({ congId: congId, filename: 'cong_outgoing_speakers.txt' });

	const outgoingSpeakersData: OutgoingSpeakersRecordType =
		outgoingSpeakers.length === 0 ? { list: [], access: [] } : JSON.parse(outgoingSpeakers);

	const outgoingSpeakersCongDetails: OutgoingSpeakersAccessStorageType[] = [];

	for (const record of outgoingSpeakersData.access) {
		const cong = CongregationsList.findById(record.cong_id);

		if (cong) {
			const obj: OutgoingSpeakersAccessStorageType = {
				...record,
				cong_name: cong.cong_name,
				cong_number: cong.cong_number,
				country_code: cong.country_code,
			};

			outgoingSpeakersCongDetails.push(obj);
		}
	}

	outgoingSpeakersData.access = outgoingSpeakersCongDetails;
	outgoingSpeakersData.speakers_key = await getFileFromStorage({ congId: congId, filename: 'cong_speakers_key.txt' });

	return outgoingSpeakersData;
};

export const dbCongregationLoadDetails = async (congId: string) => {
	const congRecord = await dbCongregationDetails(congId);

	const cong_outgoing_speakers = await dbGetOutgoingSpeakersAccessList(congId);

	const cong_master_key = await getFileFromStorage({ congId: congId, filename: 'cong_master_key.txt' });

	const cong_access_code = await getFileFromStorage({ congId: congId, filename: 'cong_access_code.txt' });

	const cong_persons = await getCongregationPersons(congId);

	const speakers_congregations = await getSpeakersCongregations(congId);

	const visiting_speakers = await getVisitingSpeakers(congId);

	return {
		...congRecord,
		cong_master_key,
		cong_access_code,
		cong_outgoing_speakers,
		cong_persons,
		speakers_congregations,
		visiting_speakers,
	};
};

export const dbCongregationSaveBackup = async (congId: string, cong_backup: CongregationBackupType) => {
	if (cong_backup.cong_persons) {
		for await (const person of cong_backup.cong_persons) {
			const personData = JSON.stringify(person);
			await uploadFileToStorage(personData, { congId, filename: `cong_persons/${person.person_uid}/person_data.txt` });
		}
	}

	if (cong_backup.speakers_key) {
		await uploadFileToStorage(cong_backup.speakers_key, { congId, filename: `cong_speakers_key.txt` });
	}

	if (cong_backup.speakers_congregations) {
		const congregationsData = JSON.stringify(cong_backup.speakers_congregations);
		await uploadFileToStorage(congregationsData, { congId, filename: `speakers_congregations.txt` });
	}

	if (cong_backup.visiting_speakers) {
		const speakersData = JSON.stringify(cong_backup.visiting_speakers);
		await uploadFileToStorage(speakersData, { congId, filename: `visiting_speakers.txt` });
	}

	if (cong_backup.outgoing_speakers) {
		const cong = CongregationsList.findById(congId)!;
		const outgoingData: OutgoingSpeakersRecordType = {
			list: cong_backup.outgoing_speakers,
			access: cong.cong_outgoing_speakers.access,
			speakers_key: cong_backup.speakers_key ?? cong.cong_outgoing_speakers.speakers_key,
		};

		const data = JSON.stringify(outgoingData);
		await uploadFileToStorage(data, { congId, filename: `cong_outgoing_speakers.txt` });
	}

	const objFS: StorageCongregation = {};
	if (cong_backup.cong_settings) {
		if (cong_backup.cong_settings.cong_discoverable) {
			objFS.cong_discoverable = cong_backup.cong_settings.cong_discoverable;
		}
	}

	objFS.last_backup = new Date().toISOString();

	await db.collection('congregations').doc(congId).set(objFS, { merge: true });

	return objFS.last_backup;
};

export const dbCongregationSaveMasterKey = async (congId: string, key: string) => {
	await uploadFileToStorage(key, { congId, filename: 'cong_master_key.txt' });
};

export const dbCongregationSaveAccessCode = async (congId: string, code: string) => {
	await uploadFileToStorage(code, { congId, filename: 'cong_access_code.txt' });
};

export const dbCongregationCreate = async (data: CongregationCreateInfoType) => {
	const dataSave = {
		country_code: data.country_code,
		cong_number: data.cong_number,
		cong_name: data.cong_name,
		cong_discoverable: { value: false, updatedAt: new Date().toISOString() },
		cong_location: data.cong_location,
		cong_circuit: [{ type: 'main', name: data.cong_circuit }],
		midweek_meeting: [{ type: 'main', ...data.midweek_meeting }],
		weekend_meeting: [{ type: 'main', ...data.weekend_meeting }],
	};

	const cong = await db.collection('congregations').add(dataSave);
	return cong.id;
};

export const dbCongregationDelete = async (id: string) => {
	await db.collection('congregations').doc(id).delete();
};
