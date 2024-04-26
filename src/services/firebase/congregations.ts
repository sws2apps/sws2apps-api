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
	const cong = await db.collection('congregations').add(data);
	return cong.id;
};

export const dbCongregationDelete = async (id: string) => {
	await db.collection('congregations').doc(id).delete();
};
