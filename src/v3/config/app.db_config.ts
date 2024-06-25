import { getFirestore } from 'firebase-admin/firestore';
import { getApp } from 'firebase-admin/app';
import { API_VAR } from '../../index.js';

const db = getFirestore(getApp());

export const initializeAPI = async () => {
	try {
		let settingID: string | undefined;

		const apiSettings = db.collection('api_settings_v3');
		const snapshot = await apiSettings.get();
		snapshot.forEach((doc) => {
			settingID = doc.id;
			API_VAR.MINIMUM_APP_VERSION = doc.data().minimum_version;
		});

		if (!settingID) {
			const data = {
				minimum_version: '1.0.0',
			};

			await db.collection('api_settings_v3').add(data);
			API_VAR.MINIMUM_APP_VERSION = data.minimum_version;
		}
	} catch (err) {
		throw new Error(String(err));
	}
};
