import { AppInstallation } from '../../definition/installations.js';
import { getFileFromStorage, uploadFileToStorage } from './storage_utils.js';

export const loadInstallation = async () => {
	const installation = JSON.parse(
		(await getFileFromStorage({ type: 'api', path: 'installations.txt' })) || '{"linked":[],"pending":[]}'
	);

	return installation as AppInstallation;
};

export const setInstallation = async (installation: AppInstallation) => {
	const data = JSON.stringify(installation);
	const path = `installations.txt`;

	await uploadFileToStorage(data, { type: 'api', path });
};
