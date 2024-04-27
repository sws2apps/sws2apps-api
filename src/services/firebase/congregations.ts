import { getFirestore } from 'firebase-admin/firestore';
import { getFileFromStorage, uploadFileToStorage } from './storage-utils.js';
import { CongregationCreateInfoType, CongregationRecordType } from '../../denifition/congregation.js';

const db = getFirestore(); //get default database

export const dbCongregationLoadDetails = async (congId: string) => {
	const congRef = db.collection('congregations').doc(congId);
	const congSnapshot = await congRef.get();
	const congRecord = congSnapshot.data() as CongregationRecordType;

	const cong_encryption = await getFileFromStorage({ congId: congId, filename: 'cong_key.txt' });

	return { ...congRecord, cong_encryption };
};

export const dbCongregationSaveBackup = async (congId: string) => {
	const data = { last_backup: new Date().toISOString() };
	await db.collection('congregations').doc(congId).set(data, { merge: true });

	return data.last_backup;
};

export const dbCongregationSaveEncryptionKey = async (congId: string, key: string) => {
	await uploadFileToStorage(key, { congId, filename: 'cong_key.txt' });
};

export const dbCongregationCreate = async (data: CongregationCreateInfoType) => {
	const dataSave = {
		country_code: data.country_code,
		cong_number: data.cong_number,
		cong_name: data.cong_name,
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
