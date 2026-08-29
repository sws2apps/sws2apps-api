import { getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const apiSettingsCollection = 'api_settings_v3';
const defaultMinimumClientVersion = '1.0.0';

export const loadOrCreateMinimumClientVersionRecord = async (): Promise<string> => {
	const database = getFirestore(getApp());
	const apiSettings = database.collection(apiSettingsCollection);
	const snapshot = await apiSettings.get();
	let settingsDocumentFound = false;
	let minimumVersion: string | undefined;

	snapshot.forEach((document) => {
		settingsDocumentFound = true;
		minimumVersion = document.data().minimum_version;
	});

	if (!settingsDocumentFound) {
		await apiSettings.add({
			minimum_version: defaultMinimumClientVersion,
		});

		return defaultMinimumClientVersion;
	}

	return minimumVersion as string;
};

export const updateMinimumClientVersionRecord = async (
	minimumVersion: string,
): Promise<void> => {
	const database = getFirestore(getApp());
	const apiSettings = database.collection(apiSettingsCollection);
	const snapshot = await apiSettings.limit(1).get();
	const settingsDocument = snapshot.docs[0];

	await settingsDocument.ref.update({
		minimum_version: minimumVersion,
	});
};
