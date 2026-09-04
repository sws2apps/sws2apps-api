import { getFileFromStorage, uploadFileToStorage } from '#platform/firebase/storage.js';
import {
	isTimestampOnOrAfter,
	subtractUtcMonths,
} from '#domain/time/retention-period.js';
import { Flag } from './flag.js';
import { FeatureFlag } from './feature-flag.js';

const featureFlagsStoragePath = 'flags.txt';

export type FeatureFlagLoadingOperations = {
	getStoredFile: typeof getFileFromStorage;
	getCurrentTime: () => Date;
};

const defaultLoadingOperations: FeatureFlagLoadingOperations = {
	getStoredFile: (path) => getFileFromStorage(path),
	getCurrentTime: () => new Date(),
};

export const loadFeatureFlags = async (
	operations: Partial<FeatureFlagLoadingOperations> = {},
): Promise<Flag[]> => {
	const loading = {
		...defaultLoadingOperations,
		...operations,
	};
	const storedData = await loading.getStoredFile({
		type: 'api',
		path: featureFlagsStoragePath,
	});
	const storedFlags = JSON.parse(storedData || '[]');
	const flags: Flag[] = [];
	const retentionCutoff = subtractUtcMonths(loading.getCurrentTime(), 3);

	for (const storedFlag of storedFlags) {
		flags.push(new Flag(storedFlag));
	}

	// Preserve the existing cleanup of old installation assignments.
	for (const flag of flags) {
		flag.installations = flag.installations.filter((installation) => {
			return isTimestampOnOrAfter(installation.registered, retentionCutoff);
		});
	}

	return flags;
};

export const saveFeatureFlags = async (flags: FeatureFlag[]): Promise<void> => {
	const serializedFlags = JSON.stringify(flags);

	await uploadFileToStorage(serializedFlags, {
		type: 'api',
		path: featureFlagsStoragePath,
	});
};
