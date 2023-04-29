import { getStorage } from 'firebase-admin/storage';
import { readFile, writeFile } from 'node:fs/promises';

export const getFileFromStorage = async (cong_id, filename, string = false) => {
	const storageBucket = getStorage().bucket();
	const file = await storageBucket.file(`${cong_id}/${filename}`);

	let data = string ? '' : [];

	const [fileExist] = await file.exists();
	if (fileExist) {
		await file.download({ destination: `./cong_backup/${cong_id}/${filename}` });
		const tmpFile = await readFile(`./cong_backup/${cong_id}/${filename}`);

		data = string ? tmpFile.toString() : JSON.parse(tmpFile);
	}

	return data;
};

export const uploadFileToStorage = async (cong_id, data, filename) => {
	const storageBucket = getStorage().bucket();
	await writeFile(`./cong_backup/${cong_id}/${filename}`, data);
	await storageBucket.upload(`./cong_backup/${cong_id}/${filename}`, { destination: `${cong_id}/${filename}` });
};
