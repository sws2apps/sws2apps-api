import { getFirestore } from 'firebase-admin/firestore';
import {
	getCongregationPersons,
	getFileFromStorage,
	getPublicMeetingSchedules,
	getPublicMeetingSources,
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
import { encryptData } from '../encryption/encryption.js';

const db = getFirestore(); //get default database

export const dbCongregationDetails = async (congId: string) => {
	const congRef = db.collection('congregations_v3').doc(congId);
	const congSnapshot = await congRef.get();
	const congRecord = congSnapshot.data() as CongregationRecordType;

	return congRecord;
};

const dbGetOutgoingSpeakersAccessList = async (congId: string) => {
	const outgoingSpeakers = await getFileFromStorage({ congId: congId, filename: 'cong_outgoing_speakers.txt' });

	const outgoingSpeakersData: OutgoingSpeakersRecordType =
		outgoingSpeakers.length === 0 ? { list: [], access: [] } : JSON.parse(outgoingSpeakers);

	const outgoingSpeakersCongDetails: OutgoingSpeakersAccessStorageType[] = [];

	for await (const record of outgoingSpeakersData.access) {
		const cong = await dbCongregationDetails(record.cong_id);

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

	const public_meeting_sources = await getPublicMeetingSources(congId);

	const public_meeting_schedules = await getPublicMeetingSchedules(congId);

	return {
		...congRecord,
		cong_master_key,
		cong_access_code,
		cong_outgoing_speakers,
		cong_persons,
		speakers_congregations,
		visiting_speakers,
		public_meeting_sources,
		public_meeting_schedules,
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

	await db.collection('congregations_v3').doc(congId).set(objFS, { merge: true });

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
		cong_location: { ...data.cong_location, updatedAt: new Date().toISOString() },
		cong_circuit: [{ type: 'main', value: data.cong_circuit, updatedAt: new Date().toISOString() }],
		midweek_meeting: [
			{
				type: 'main',
				weekday: {
					value: data.midweek_meeting.weekday,
					updatedAt: new Date().toISOString(),
				},
				time: {
					value: data.midweek_meeting.time,
					updatedAt: new Date().toISOString(),
				},
			},
		],
		weekend_meeting: [
			{
				type: 'main',
				weekday: {
					value: data.weekend_meeting.weekday,
					updatedAt: new Date().toISOString(),
				},
				time: {
					value: data.weekend_meeting.time,
					updatedAt: new Date().toISOString(),
				},
			},
		],
	};

	const cong = await db.collection('congregations_v3').add(dataSave);
	return cong.id;
};

export const dbCongregationDelete = async (id: string) => {
	await db.collection('congregations_v3').doc(id).delete();
};

export const dbCongregationRequestAccess = async (congId: string, requestCongId: string, key: string, requestId: string) => {
	const requestCong = CongregationsList.findById(requestCongId)!;

	requestCong.cong_outgoing_speakers.access = requestCong.cong_outgoing_speakers.access.filter(
		(record) => record.cong_id !== congId
	);

	requestCong.cong_outgoing_speakers.access.push({
		cong_id: congId,
		key: '',
		status: 'pending',
		updatedAt: new Date().toISOString(),
		temp_key: key,
		request_id: requestId,
	});

	const data = JSON.stringify({
		list: requestCong.cong_outgoing_speakers.list,
		access: requestCong.cong_outgoing_speakers.access,
	});

	await uploadFileToStorage(data, { congId: requestCongId, filename: `cong_outgoing_speakers.txt` });
};

export const dbCongregationApproveAccessRequest = async (congId: string, request_id: string, speakers_key: string) => {
	const cong = CongregationsList.findById(congId)!;

	const request = cong.cong_outgoing_speakers.access.find((record) => record.request_id === request_id)!;

	request.key = encryptData(JSON.stringify(speakers_key), request.temp_key);
	request.status = 'approved';
	request.updatedAt = new Date().toISOString();

	delete request.temp_key;

	const data = JSON.stringify({
		list: cong.cong_outgoing_speakers.list,
		access: cong.cong_outgoing_speakers.access,
	});

	await uploadFileToStorage(data, { congId, filename: `cong_outgoing_speakers.txt` });
};

export const dbCongregationRejectAccessRequest = async (congId: string, requestId: string) => {
	const cong = CongregationsList.findById(congId)!;

	const request = cong.cong_outgoing_speakers.access.find((record) => record.request_id === requestId)!;

	request.status = 'disapproved';
	request.updatedAt = new Date().toISOString();

	if (request.temp_key) delete request.temp_key;

	const data = JSON.stringify({
		list: cong.cong_outgoing_speakers.list,
		access: cong.cong_outgoing_speakers.access,
	});

	await uploadFileToStorage(data, { congId, filename: `cong_outgoing_speakers.txt` });
};

export const dbCongregationPublishSchedules = async (congId: string, sources: string, schedules: string) => {
	await uploadFileToStorage(sources, { congId, filename: 'public_meeting_sources.txt' });
	await uploadFileToStorage(schedules, { congId, filename: 'public_meeting_schedules.txt' });
};
