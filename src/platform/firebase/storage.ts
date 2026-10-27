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

const readFileGeneration = async (options: StorageBaseType) => {
	const file = getStorage().bucket().file(buildStoragePath(options));
	let generation: string | number = 0;
	let current: string | undefined;
	try {
		const [metadata] = await file.getMetadata();
		generation = metadata.generation!;
		const [contents] = await getStorage().bucket().file(buildStoragePath(options), { generation }).download();
		current = decryptData(contents.toString());
		if (current === undefined) throw new Error('STORAGE_DECRYPTION_FAILED');
	} catch (error) {
		if ((error as { code?: number }).code !== 404) throw error;
		if (generation !== 0) throw Object.assign(new Error('STORAGE_CONFLICT'), { code: 412 });
	}
	return { generation, current };
};

/** Uses object generations so concurrent API processes cannot overwrite a successful mutation. */
const compareAndModifyFileGeneration = async <T>(
	options: StorageBaseType,
	modify: (current: string | undefined) => { data: string; result: T },
): Promise<T> => {
	const file = getStorage().bucket().file(buildStoragePath(options));
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			const { generation, current } = await readFileGeneration(options);
			const { data, result } = modify(current);
			await file.save(encryptData(data), {
				resumable: false,
				preconditionOpts: { ifGenerationMatch: generation },
				metadata: { contentType: 'text/plain' },
			});
			return result;
		} catch (error) {
			if ((error as { code?: number }).code !== 412 || attempt === 4) throw error;
		}
	}
	throw new Error('STORAGE_CONFLICT');
};

export const compareAndModifyFile = <T>(
	options: StorageBaseType,
	modify: (current: string | undefined) => { data: string; result: T },
): Promise<T> => runWithinFileWriteQueue(
	buildStoragePath(options),
	() => compareAndModifyFileGeneration(options, modify),
);
