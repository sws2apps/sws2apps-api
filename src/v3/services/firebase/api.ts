import { getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { API_VAR } from '../../../index.js';

const db = getFirestore(getApp());

export const updateAPIMinimumClient = async (version: string) => {
	try {
		const apiSettings = db.collection('api_settings_v3');

		const snapshot = await apiSettings.limit(1).get();

		const doc = snapshot.docs[0];
		const docRef = doc.ref;

		await docRef.update({ minimum_version: version });

		API_VAR.MINIMUM_APP_VERSION = version;
	} catch (err) {
		throw new Error(String(err));
	}
};
