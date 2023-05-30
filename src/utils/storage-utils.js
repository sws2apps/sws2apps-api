import { getStorage } from 'firebase-admin/storage';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

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

export const uploadFileToStorage = async (cong_id, data, filename, userId) => {
	const storageBucket = getStorage().bucket();

	if (userId) {
		if (!existsSync(`./cong_backup/${cong_id}/usersData`)) await mkdir(`./cong_backup/${cong_id}/usersData`);
		if (!existsSync(`./cong_backup/${cong_id}/usersData/${userId}`)) await mkdir(`./cong_backup/${cong_id}/usersData/${userId}`);

		await writeFile(`./cong_backup/${cong_id}/usersData/${userId}/${filename}`, data);
		await storageBucket.upload(`./cong_backup/${cong_id}/usersData/${userId}/${filename}`, {
			destination: `${cong_id}/usersData/${userId}/${filename}`,
		});
	}

	if (!userId) {
		await writeFile(`./cong_backup/${cong_id}/${filename}`, data);
		await storageBucket.upload(`./cong_backup/${cong_id}/${filename}`, { destination: `${cong_id}/${filename}` });
	}
};

export const getUserReportsAll = async (cong_id) => {
	try {
		const storageBucket = getStorage().bucket();
		const tmpData = await storageBucket.getFiles({ prefix: `${cong_id}/usersData` });
		const userData = tmpData[0];
		const reportFiles = [];

		for await (const file of userData) {
			const isReportFile = file.name.indexOf('/fieldServiceReports.txt') !== -1;

			if (isReportFile) {
				const userUid = file.name.split('/')[2];

				if (!existsSync(`./cong_backup/${cong_id}/usersData/${userUid}`))
					await mkdir(`./cong_backup/${cong_id}/usersData/${userUid}`);

				await file.download({ destination: `./cong_backup/${file.name}` });
				const tmpFile = await readFile(`./cong_backup/${file.name}`);

				reportFiles.push({ user_local_uid: userUid, reports: JSON.parse(tmpFile) });
			}
		}

		return reportFiles;
	} catch (err) {
		console.error(err);
	}
};

export const getUserReport = async (cong_id, user_uid) => {
	const storageBucket = getStorage().bucket();
	const file = await storageBucket.file(`${cong_id}/usersData/${user_uid}/fieldServiceReports.txt`);
	let data;

	const [fileExist] = await file.exists();

	if (fileExist) {
		if (!existsSync(`./cong_backup/${cong_id}/usersData/${user_uid}`)) {
			await mkdir(`./cong_backup/${cong_id}/usersData/${user_uid}`);
		}

		await file.download({
			destination: `./cong_backup/${cong_id}/usersData/${user_uid}/fieldServiceReports.txt`,
		});

		const tmpFile = await readFile(`./cong_backup/${cong_id}/usersData/${user_uid}/fieldServiceReports.txt`);

		data = JSON.parse(tmpFile);
	}

	return data;
};
