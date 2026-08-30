import { loadFeatureFlags } from './feature-flags.repository.js';
import { Flags } from './flags.js';

export const initializeFeatureFlags = async (): Promise<void> => {
	Flags.replace(await loadFeatureFlags());
};
