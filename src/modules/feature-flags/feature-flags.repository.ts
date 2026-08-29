import { getFileFromStorage, uploadFileToStorage } from '../../platform/firebase/storage.js';
import { Flag } from '../../v3/classes/Flag.js';
import { FeatureFlag } from '../../v3/definition/flag.js';

const featureFlagsStoragePath = 'flags.txt';

export const loadFeatureFlags = async (): Promise<Flag[]> => {
	const storedData = await getFileFromStorage({
		type: 'api',
		path: featureFlagsStoragePath,
	});
	const storedFlags = JSON.parse(storedData || '[]');
	const flags: Flag[] = [];

	for (const storedFlag of storedFlags) {
		flags.push(new Flag(storedFlag));
	}

	// Preserve the existing cleanup of old installation assignments.
	for (const flag of flags) {
		flag.installations = flag.installations.filter((installation) => {
			const lastThreeMonths = new Date();
			lastThreeMonths.setMonth(-3);

			return installation.registered >= lastThreeMonths.toISOString();
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
