import { getStorage } from 'firebase-admin/storage';
import { decryptData, encryptData } from '#platform/encryption/encryption.js';
import { buildStoragePath } from './storage.js';
import type { StorageBaseType } from './storage.types.js';

export type VersionedStorageValue = { data: string | undefined; generation: string };

const hasCode = (error: unknown, code: number): boolean =>
	typeof error === 'object' && error !== null && 'code' in error && Number(error.code) === code;

/** Pin the download to its metadata generation so a concurrent write cannot mix data and version. */
export const readVersionedStorage = async (
	options: StorageBaseType,
): Promise<VersionedStorageValue> => {
	const bucket = getStorage().bucket();
	const path = buildStoragePath(options);
	for (let attempt = 0; attempt < 3; attempt += 1) {
		let generation: string;
		try {
			const [metadata] = await bucket.file(path).getMetadata();
			generation = String(metadata.generation);
		} catch (error) {
			if (hasCode(error, 404)) return { data: undefined, generation: '0' };
			throw error;
		}
		try {
			const [contents] = await bucket.file(path, { generation }).download();
			const data = decryptData(contents.toString());
			if (data === undefined) throw new Error('Unable to decrypt versioned storage');
			return { data, generation };
		} catch (error) {
			if (!hasCode(error, 404)) throw error;
		}
	}
	throw new Error('Versioned storage changed repeatedly during read');
};

/** Storage generation preconditions protect writes across processes and server instances. */
export const writeVersionedStorage = async (
	options: StorageBaseType,
	expectedGeneration: string,
	data: string,
): Promise<boolean> => {
	const file = getStorage().bucket().file(buildStoragePath(options));
	try {
		await file.save(encryptData(data), {
			resumable: false,
			preconditionOpts: { ifGenerationMatch: expectedGeneration },
			metadata: { contentType: 'text/plain' },
		});
		return true;
	} catch (error) {
		if (hasCode(error, 412)) return false;
		throw error;
	}
};
