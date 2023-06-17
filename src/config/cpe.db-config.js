import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const initializeAPI = async () => {
	try {
		let settingID;
		const apiSettings = db.collection('api_settings');
		const snapshot = await apiSettings.get();
		snapshot.forEach((doc) => {
			settingID = doc.id;
			global.minimumVersionCPE = doc.data().minimum_version;
		});

		if (!settingID) {
			const data = {
				minimum_version: '1.0.0',
			};

			await db.collection('api_settings').add(data);
			global.minimumVersionCPE = data.minimum_version;
		}
	} catch (err) {
		throw new Error(err);
	}
};
