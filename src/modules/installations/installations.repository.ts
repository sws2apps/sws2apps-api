import { getFileFromStorage, uploadFileToStorage } from '#platform/firebase/storage.js';
import {
	isTimestampOnOrAfter,
	subtractUtcMonths,
} from '#domain/time/retention-period.js';
import { AppInstallation } from './installation.js';

const installationsStoragePath = 'installations.txt';
const emptyInstallations = '{"linked":[],"pending":[]}';

export type InstallationLoadingOperations = {
	getStoredFile: typeof getFileFromStorage;
	getCurrentTime: () => Date;
};

const defaultLoadingOperations: InstallationLoadingOperations = {
	getStoredFile: (path) => getFileFromStorage(path),
	getCurrentTime: () => new Date(),
};

export const loadInstallations = async (
	operations: Partial<InstallationLoadingOperations> = {},
): Promise<AppInstallation> => {
	const loading = {
		...defaultLoadingOperations,
		...operations,
	};
	const storedData = await loading.getStoredFile({
		type: 'api',
		path: installationsStoragePath,
	});
	const installations = JSON.parse(storedData || emptyInstallations) as AppInstallation;
	const retentionCutoff = subtractUtcMonths(loading.getCurrentTime(), 3);

	installations.pending = installations.pending.filter((installation) => {
		return isTimestampOnOrAfter(installation.registered, retentionCutoff);
	});

	for (const linkedUser of installations.linked) {
		linkedUser.installations = linkedUser.installations.filter((installation) => {
			return isTimestampOnOrAfter(installation.registered, retentionCutoff);
		});
	}

	return installations;
};

export const saveInstallations = async (
	installations: AppInstallation,
): Promise<void> => {
	const serializedInstallations = JSON.stringify(installations);

	await uploadFileToStorage(serializedInstallations, {
		type: 'api',
		path: installationsStoragePath,
	});
};
