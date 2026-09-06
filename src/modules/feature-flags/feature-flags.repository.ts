import {
	getFileFromStorage,
	readModifyWriteFile,
} from '#platform/firebase/storage.js';
import {
	isTimestampOnOrAfter,
	subtractUtcMonths,
} from '#domain/time/retention-period.js';
import { Flag } from './flag.js';
import type { FeatureFlag } from './feature-flag.js';

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

	for (const flag of flags) {
		flag.installations = flag.installations.filter((installation) => {
			return isTimestampOnOrAfter(installation.last_handshake, retentionCutoff);
		});
	}

	return flags;
};

export type FeatureFlagsFileUpdate<T> = {
	next: Flag[];
	result: T;
};

/**
 * Runs a read-modify-write of the feature flags file inside a per-path queue
 * slot. {@link update} receives the latest persisted flags (empty when the file
 * is absent) and must return the next flags plus the result to hand back, so
 * concurrent writes derive from the most recently persisted content.
 */
export const updateFeatureFlagsFile = async <T>(
	update: (current: Flag[]) => Promise<FeatureFlagsFileUpdate<T>>,
) => {
	return readModifyWriteFile(
		{ type: 'api', path: featureFlagsStoragePath },
		async (current) => {
			const persisted = JSON.parse(current || '[]') as FeatureFlag[];
			const storedFlags: Flag[] = persisted.map((flag) => new Flag(flag));
			const { next, result } = await update(storedFlags);
			return { data: JSON.stringify(next), result };
		},
	);
};
