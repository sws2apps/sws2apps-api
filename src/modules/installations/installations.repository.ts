import {
	getFileFromStorage,
	readModifyWriteFile,
} from '#platform/firebase/storage.js';
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

const normalizeInstallationItem = (item: {
	id: string;
	registered?: string;
	last_handshake?: string;
}) => ({
	id: item.id,
	last_handshake: item.last_handshake ?? item.registered ?? '',
});

const parseInstallations = (storedData: string | undefined): AppInstallation => {
	if (!storedData) return JSON.parse(emptyInstallations) as AppInstallation;

	const parsed = JSON.parse(storedData) as AppInstallation;

	return {
		pending: parsed.pending.map(normalizeInstallationItem),
		linked: parsed.linked.map((user) => ({
			...user,
			installations: user.installations.map(normalizeInstallationItem),
		})),
	};
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
	const installations = parseInstallations(storedData);
	const retentionCutoff = subtractUtcMonths(loading.getCurrentTime(), 3);

	installations.pending = installations.pending.filter((installation) => {
		return isTimestampOnOrAfter(installation.last_handshake, retentionCutoff);
	});

	for (const linkedUser of installations.linked) {
		linkedUser.installations = linkedUser.installations.filter((installation) => {
			return isTimestampOnOrAfter(installation.last_handshake, retentionCutoff);
		});
	}

	return installations;
};

export type InstallationFileUpdate<T> = {
	next: AppInstallation;
	result: T;
};

/**
 * Runs a read-modify-write of the installations file inside a per-path queue
 * slot. {@link update} receives the latest persisted state (empty when the file
 * is absent) and must return the next state plus the result to hand back, so
 * concurrent registrations derive from the most recently persisted content.
 */
export const updateInstallationsFile = async <T>(
	update: (current: AppInstallation) => Promise<InstallationFileUpdate<T>>,
) => {
	return readModifyWriteFile(
		{ type: 'api', path: installationsStoragePath },
		async (current) => {
			const persisted = parseInstallations(current);
			const { next, result } = await update(persisted);
			return { data: JSON.stringify(next), result };
		},
	);
};
