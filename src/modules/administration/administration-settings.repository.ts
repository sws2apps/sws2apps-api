import { getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const updateMinimumClientVersionRecord = async (
	minimumVersion: string,
): Promise<void> => {
	const database = getFirestore(getApp());
	const apiSettings = database.collection('api_settings_v3');
	const snapshot = await apiSettings.limit(1).get();
	const settingsDocument = snapshot.docs[0];

	await settingsDocument.ref.update({
		minimum_version: minimumVersion,
	});
};
