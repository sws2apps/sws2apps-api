import { getStorage } from 'firebase-admin/storage';

import { decryptData, encryptData } from '../encryption/encryption.js';
import type { StorageBaseType } from './storage.types.js';

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
