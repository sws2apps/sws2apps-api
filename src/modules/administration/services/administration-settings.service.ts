import { serverState } from '#platform/runtime/server-state.js';
import {
	loadOrCreateMinimumClientVersionRecord,
	updateMinimumClientVersionRecord,
} from '../repositories/administration-settings.repository.js';

type UpdateMinimumClientVersionRecord = (minimumVersion: string) => Promise<void>;
type LoadMinimumClientVersionRecord = () => Promise<string>;

export const getMinimumClientVersion = (): string => serverState.minimumAppVersion;

export const initializeMinimumClientVersion = async (
	loadVersionRecord: LoadMinimumClientVersionRecord = loadOrCreateMinimumClientVersionRecord,
): Promise<void> => {
	const minimumVersion = await loadVersionRecord();

	serverState.minimumAppVersion = minimumVersion;
};

export const updateMinimumClientVersion = async (
	minimumVersion: string,
	updateVersionRecord: UpdateMinimumClientVersionRecord = updateMinimumClientVersionRecord,
): Promise<string> => {
	await updateVersionRecord(minimumVersion);

	serverState.minimumAppVersion = minimumVersion;

	return minimumVersion;
};
