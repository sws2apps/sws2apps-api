import {
	addCollectionRecord,
	getCollectionRecords,
	getFirstCollectionRecord,
	updateCollectionRecord,
} from '../../platform/firebase/document-store.js';

const apiSettingsCollection = 'api_settings_v3';
const defaultMinimumClientVersion = '1.0.0';

export const loadOrCreateMinimumClientVersionRecord = async (): Promise<string> => {
	const settingsRecords = await getCollectionRecords(apiSettingsCollection);
	let minimumVersion: string | undefined;

	for (const settingsRecord of settingsRecords) {
		minimumVersion = settingsRecord.data.minimum_version as string | undefined;
	}

	if (settingsRecords.length === 0) {
		await addCollectionRecord(apiSettingsCollection, {
			minimum_version: defaultMinimumClientVersion,
		});

		return defaultMinimumClientVersion;
	}

	return minimumVersion as string;
};

export const updateMinimumClientVersionRecord = async (
	minimumVersion: string,
): Promise<void> => {
	const settingsRecord = await getFirstCollectionRecord(apiSettingsCollection);

	if (!settingsRecord) {
		throw new Error('API settings record was not initialized');
	}

	await updateCollectionRecord(apiSettingsCollection, settingsRecord.id, {
		minimum_version: minimumVersion,
	});
};
