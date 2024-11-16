import { getStorage } from 'firebase-admin/storage';

export const getFileFromStorage = async (cong_id, filename, string = false) => {
	const storageBucket = getStorage().bucket();
	const file = await storageBucket.file(`${cong_id}/${filename}`);

	let data = string ? '' : [];

	const [fileExist] = await file.exists();

	if (fileExist) {
		const contents = await file.download();
		data = string ? contents.toString() : JSON.parse(contents.toString());
	}

	return data;
};

export const uploadFileToStorage = async (cong_id, data, filename, userId) => {
	const storageBucket = getStorage().bucket();

	if (userId) {
		const destPath = `${cong_id}/usersData/${userId}/${filename}`;

		const file = storageBucket.file(destPath);
		await file.save(data, { contentType: 'text/plain' });
	}

	if (!userId) {
		const destPath = `${cong_id}/${filename}`;

		const file = storageBucket.file(destPath);
		await file.save(data, { contentType: 'text/plain' });
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

				const contents = await file.download();

				reportFiles.push({ user_local_uid: userUid, reports: JSON.parse(contents.toString()) });
			}
		}

		return reportFiles;
	} catch (err) {
		console.error(err.message);
	}
};

export const getUserReport = async (cong_id, user_uid) => {
	const storageBucket = getStorage().bucket();
	const file = await storageBucket.file(`${cong_id}/usersData/${user_uid}/fieldServiceReports.txt`);

	let data;

	const [fileExist] = await file.exists();

	if (fileExist) {
		const contents = await file.download();
		data = JSON.parse(contents.toString());
	}

	return data;
};
