import { getFileFromStorage, uploadFileToStorage } from '../../platform/firebase/storage.js';
import { AppInstallation } from '../../v3/definition/installations.js';

const installationsStoragePath = 'installations.txt';
const emptyInstallations = '{"linked":[],"pending":[]}';

export const loadInstallations = async (): Promise<AppInstallation> => {
	const storedData = await getFileFromStorage({
		type: 'api',
		path: installationsStoragePath,
	});
	const installations = JSON.parse(storedData || emptyInstallations) as AppInstallation;

	installations.pending = installations.pending.filter((installation) => {
		const lastThreeMonths = new Date();
		lastThreeMonths.setMonth(-3);

		return installation.registered >= lastThreeMonths.toISOString();
	});

	for (const linkedUser of installations.linked) {
		linkedUser.installations = linkedUser.installations.filter((installation) => {
			const lastThreeMonths = new Date();
			lastThreeMonths.setMonth(-3);

			return installation.registered >= lastThreeMonths.toISOString();
		});
	}

	return installations;
};

export const saveInstallations = async (
	installations: AppInstallation,
): Promise<void> => {
	const serializedInstallations = JSON.stringify(installations);

	await uploadFileToStorage(serializedInstallations, {
		type: 'api',
		path: installationsStoragePath,
	});
};
