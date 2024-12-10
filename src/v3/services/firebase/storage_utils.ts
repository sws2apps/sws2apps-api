import { getStorage } from 'firebase-admin/storage';
import { StorageBaseType } from '../../definition/firebase.js';
import { decryptData, encryptData } from '../encryption/encryption.js';

export const uploadFileToStorage = async (data: string, options: StorageBaseType) => {
	const { path, type } = options;

	let destPath = 'v3/';

	if (type === 'congregation') {
		destPath += `congregations/${path}`;
	}

	if (type === 'user') {
		destPath += `users/${path}`;
	}

	const storageBucket = getStorage().bucket();
	const file = storageBucket.file(destPath);

	const encryptedData = encryptData(data);

	await file.save(encryptedData, { metadata: { contentType: 'text/plain' } });

	return encryptedData;
};

export const getFileMetadata = async ({ path, type }: StorageBaseType) => {
	let destPath = 'v3/';

	if (type === 'congregation') {
		destPath += `congregations/${path}`;
	}

	if (type === 'user') {
		destPath += `users/${path}`;
	}

	const storageBucket = getStorage().bucket();
	const file = await storageBucket.file(destPath);

	const [fileExist] = await file.exists();

	if (fileExist) {
		return file.metadata;
	}
};

export const getFileFromStorage = async ({ path, type }: StorageBaseType) => {
	let destPath = 'v3/';

	if (type === 'congregation') {
		destPath += `congregations/${path}`;
	}

	if (type === 'user') {
		destPath += `users/${path}`;
	}

	const storageBucket = getStorage().bucket();
	const file = await storageBucket.file(destPath);

	const [fileExist] = await file.exists();

	if (fileExist) {
		const contents = await file.download();
		const encryptedData = contents.toString();

		return decryptData(encryptedData);
	}
};

export const deleteFileFromStorage = async ({ path, type }: StorageBaseType) => {
	if (!path || path.length === 0) return;

	let destPath = 'v3/';

	if (type === 'congregation') {
		destPath += `congregations/${path}`;
	}

	if (type === 'user') {
		destPath += `users/${path}`;
	}

	const storageBucket = getStorage().bucket();
	await storageBucket.deleteFiles({ prefix: destPath, force: true });
};
