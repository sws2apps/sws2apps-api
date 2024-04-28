import { getStorage } from 'firebase-admin/storage';
import { StorageBaseType } from '../../denifition/firebase.js';

export const uploadFileToStorage = async (data: string, options: StorageBaseType) => {
	const { congId, filename, userId } = options;

	let destinationFilename = '';

	if (userId) {
		destinationFilename = `${congId}/usersData/${userId}/${filename}`;
	}

	if (!userId) {
		destinationFilename = `${congId}/${filename}`;
	}

	const storageBucket = getStorage().bucket();
	const file = storageBucket.file(destinationFilename);
	await file.save(data, { metadata: { contentType: 'text/plain' } });
};

export const getFileFromStorage = async (params: StorageBaseType) => {
	let data = '';

	const { congId, filename, userId } = params;

	let destinationFilename = '';

	if (userId) {
		destinationFilename = `${congId}/usersData/${userId}/${filename}`;
	}

	if (!userId) {
		destinationFilename = `${congId}/${filename}`;
	}

	const storageBucket = getStorage().bucket();
	const file = await storageBucket.file(destinationFilename);
	const [fileExist] = await file.exists();

	if (fileExist) {
		const contents = await file.download();
		data = contents.toString();
	}

	return data;
};
