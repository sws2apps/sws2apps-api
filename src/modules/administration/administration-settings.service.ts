import { serverState } from '../../platform/runtime/server-state.js';
import { updateMinimumClientVersionRecord } from './administration-settings.repository.js';

type UpdateMinimumClientVersionRecord = (minimumVersion: string) => Promise<void>;

export const updateMinimumClientVersion = async (
	minimumVersion: string,
	updateVersionRecord: UpdateMinimumClientVersionRecord = updateMinimumClientVersionRecord,
): Promise<void> => {
	await updateVersionRecord(minimumVersion);

	serverState.minimumAppVersion = minimumVersion;
};
