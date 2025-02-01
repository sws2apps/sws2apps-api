import { AppInstallation } from '../../definition/installations.js';
import { getFileFromStorage, uploadFileToStorage } from './storage_utils.js';

export const loadInstallation = async () => {
	const installation = JSON.parse(
		(await getFileFromStorage({ type: 'api', path: 'installations.txt' })) || '{"linked":[],"pending":[]}'
	) as AppInstallation;

	installation.pending = installation.pending.filter((record) => {
		const last3Month = new Date();
		last3Month.setMonth(-3);

		return record.registered >= last3Month.toISOString();
	});

	for (const user of installation.linked) {
		user.installations = user.installations.filter((record) => {
			const last3Month = new Date();
			last3Month.setMonth(-3);

			return record.registered >= last3Month.toISOString();
		});
	}

	return installation;
};

export const setInstallation = async (installation: AppInstallation) => {
	const data = JSON.stringify(installation);
	const path = `installations.txt`;

	await uploadFileToStorage(data, { type: 'api', path });
};
