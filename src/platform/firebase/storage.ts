import { getStorage } from 'firebase-admin/storage';

import { decryptData, encryptData } from '#platform/encryption/encryption.js';
import type {
	StorageBaseType,
	StorageFileEntry,
	StorageFileListOptions,
} from './storage.types.js';

export const buildStoragePath = (
	{ path, type }: StorageBaseType,
	includeApiStorage = true,
): string => {
	let destinationPath = 'v3/';

	if (type === 'congregation') {
		destinationPath += `congregations/${path}`;
	}

	if (type === 'user') {
		destinationPath += `users/${path}`;
	}

	if (type === 'api' && includeApiStorage) {
		destinationPath += `api/${path}`;
	}

	return destinationPath;
};

export const uploadFileToStorage = async (
	data: string,
	options: StorageBaseType,
) => {
	const destinationPath = buildStoragePath(options);
	const storageBucket = getStorage().bucket();
	const file = storageBucket.file(destinationPath);
	const encryptedData = encryptData(data);

	await file.save(encryptedData, {
		metadata: { contentType: 'text/plain' },
	});

	return encryptedData;
};

export const getFileMetadata = async (options: StorageBaseType) => {
	const destinationPath = buildStoragePath(options, false);
	const storageBucket = getStorage().bucket();
	const file = storageBucket.file(destinationPath);
	const [fileExists] = await file.exists();

	if (fileExists) {
		return file.metadata;
	}
};

export const getFileFromStorage = async (options: StorageBaseType) => {
	const destinationPath = buildStoragePath(options);
	const storageBucket = getStorage().bucket();
	const file = storageBucket.file(destinationPath);
	const [fileExists] = await file.exists();

	if (fileExists) {
		const downloadedFile = await file.download();
		const encryptedData = downloadedFile.toString();

		return decryptData(encryptedData);
	}
};

const fileWriteQueues = new Map<string, Promise<unknown>>();
const fileWriteQueueCounts = new Map<string, number>();

const runWithinFileWriteQueue = async <T>(path: string, action: () => Promise<T>): Promise<T> => {
	const previous = fileWriteQueues.get(path) ?? Promise.resolve();
	let release!: (value?: unknown) => void;
	fileWriteQueues.set(path, new Promise((resolve) => (release = resolve)));
	const prevCount = fileWriteQueueCounts.get(path) ?? 0;
	fileWriteQueueCounts.set(path, prevCount + 1);

	try {
		await previous;
		return await action();
	} finally {
		release();
		const remaining = fileWriteQueueCounts.get(path) ?? 1;
		if (remaining <= 1) {
			fileWriteQueues.delete(path);
			fileWriteQueueCounts.delete(path);
		} else {
			fileWriteQueueCounts.set(path, remaining - 1);
		}
	}
};

/**
 * Number of pending queued writes for a given resolved storage path. Used to
 * verify the per-file write queue drains (entries are removed once no writer
 * remains) rather than accumulating for the lifetime of the process.
 */
export const getPendingFileWrites = (path: StorageBaseType): number => {
	return fileWriteQueueCounts.get(buildStoragePath(path)) ?? 0;
};

export type ReadModifyWriteFileOperations = {
	read: (options: StorageBaseType) => Promise<string | undefined>;
	write: (data: string, options: StorageBaseType) => Promise<string>;
};

const defaultReadModifyWriteOperations: ReadModifyWriteFileOperations = {
	read: (options) => getFileFromStorage(options),
	write: (data, options) => uploadFileToStorage(data, options),
};

/**
 * Serializes a read-modify-write of a single storage file so concurrent
 * updates to the same path cannot lose one another's changes. {@link modify}
 * receives the latest persisted plaintext (or undefined when absent) and must
 * return the next plaintext and the result to hand back to the caller. The
 * read, transform, and write all run inside one per-file queue slot, so each
 * write derives from the most recently persisted content. Different file paths
 * proceed concurrently.
 */
export const readModifyWriteFile = async <T>(
	options: StorageBaseType,
	modify: (current: string | undefined) => Promise<{ data: string; result: T }>,
	operations: Partial<ReadModifyWriteFileOperations> = {},
): Promise<T> => {
	const readsWrites = {
		...defaultReadModifyWriteOperations,
		...operations,
	};
	const destinationPath = buildStoragePath(options);

	return runWithinFileWriteQueue(destinationPath, async () => {
		const current = await readsWrites.read(options);
		const { data, result } = await modify(current);

		if (data !== current) {
			await readsWrites.write(data, options);
		}

		return result;
	});
};

export const listFilesFromStorage = async (
	options: StorageFileListOptions,
): Promise<StorageFileEntry[]> => {
	const storagePrefix = buildStoragePath(options);
	const storageBucket = getStorage().bucket();
	const [files] = await storageBucket.getFiles({ prefix: storagePrefix });
	const includedPath = options.pathIncludes;
	const matchingFiles = includedPath
		? files.filter((file) => file.name.includes(includedPath))
		: files;

	return Promise.all(
		matchingFiles.map(async (file) => {
			const entry: StorageFileEntry = {
				path: file.name,
				updatedAt: file.metadata.updated || '',
			};

			if (options.includeContents) {
				const downloadedFile = await file.download();
				entry.contents = decryptData(downloadedFile.toString());
			}

			return entry;
		}),
	);
};

export const deleteFileFromStorage = async (options: StorageBaseType) => {
	if (!options.path || options.path.length === 0) {
		return;
	}

	const destinationPath = buildStoragePath(options, false);
	const storageBucket = getStorage().bucket();

	await storageBucket.deleteFiles({
		prefix: destinationPath,
		force: true,
	});
};

export type VersionedStorageSnapshot = { data?: string; generation: string | number };
export type VersionedStorageOperations = {
	read: (options: StorageBaseType) => Promise<VersionedStorageSnapshot>;
	write: (data: string, options: StorageBaseType, generation: string | number) => Promise<void>;
};
const storageErrorCode = (error: unknown) => Number((error as { code?: unknown })?.code);

const readVersionedFile = async (options: StorageBaseType): Promise<VersionedStorageSnapshot> => {
	const bucket = getStorage().bucket();
	const path = buildStoragePath(options);
	try {
		const [metadata] = await bucket.file(path).getMetadata();
		const generation = metadata.generation!;
		const [contents] = await bucket.file(path, { generation }).download();
		return { generation, data: decryptData(contents.toString()) };
	} catch (error) {
		if (storageErrorCode(error) !== 404) throw error;
		return { generation: 0 };
	}
};

const writeVersionedFile: VersionedStorageOperations['write'] = async (data, options, generation) => {
	await getStorage().bucket().file(buildStoragePath(options)).save(encryptData(data), {
		metadata: { contentType: 'text/plain' },
		preconditionOpts: { ifGenerationMatch: generation },
		resumable: false,
	});
};

/** Re-evaluates authorization after competing writes, including across API instances. */
const commitVersionedFile = async <T>(
	options: StorageBaseType,
	modify: (current: string | undefined) => Promise<{ data: string; result: T }>,
	operations: Partial<VersionedStorageOperations> = {},
): Promise<T> => {
	const storage = { read: readVersionedFile, write: writeVersionedFile, ...operations };
	for (let attempt = 0; attempt < 5; attempt++) {
		const snapshot = await storage.read(options);
		const { data, result } = await modify(snapshot.data);
		if (data === snapshot.data) return result;
		try {
			await storage.write(data, options, snapshot.generation);
			return result;
		} catch (error) {
			if (storageErrorCode(error) !== 412) throw error;
		}
	}
	throw new Error('Concurrent storage update could not be committed');
};

/** Serialize within an instance and enforce storage generations between instances. */
export const readModifyWriteVersionedFile = <T>(
	options: StorageBaseType,
	modify: (current: string | undefined) => Promise<{ data: string; result: T }>,
	operations: Partial<VersionedStorageOperations> = {},
): Promise<T> => runWithinFileWriteQueue(buildStoragePath(options), () => commitVersionedFile(options, modify, operations));
