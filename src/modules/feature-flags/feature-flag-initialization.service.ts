import { loadFeatureFlags } from './feature-flags.repository.js';
import { Flags } from './flags.js';
import type { Flag } from './flag.js';

export type FeatureFlagInitializationOperations = {
	loadFlags: () => Promise<Flag[]>;
	replaceFlags: (flags: Flag[]) => void;
};

const defaultInitializationOperations: FeatureFlagInitializationOperations = {
	loadFlags: () => loadFeatureFlags(),
	replaceFlags: (flags) => Flags.replace(flags),
};

export const initializeFeatureFlags = async (
	operations: Partial<FeatureFlagInitializationOperations> = {},
): Promise<void> => {
	const initialization = {
		...defaultInitializationOperations,
		...operations,
	};
	const flags = await initialization.loadFlags();

	initialization.replaceFlags(flags);
};
