import type { ServiceAccount } from 'firebase-admin/app';

const hasStringProperty = (value: Record<string, unknown>, snakeCaseName: string, camelCaseName: string) => {
	return typeof value[snakeCaseName] === 'string' || typeof value[camelCaseName] === 'string';
};

export const decodeServiceAccount = (base64Configuration: string): ServiceAccount => {
	try {
		const decodedConfiguration = Buffer.from(base64Configuration, 'base64').toString('utf8');
		const serviceAccount = JSON.parse(decodedConfiguration) as Record<string, unknown>;

		const hasProjectId = hasStringProperty(serviceAccount, 'project_id', 'projectId');
		const hasClientEmail = hasStringProperty(serviceAccount, 'client_email', 'clientEmail');
		const hasPrivateKey = hasStringProperty(serviceAccount, 'private_key', 'privateKey');

		if (!hasProjectId || !hasClientEmail || !hasPrivateKey) {
			throw new Error('required service-account fields are missing');
		}

		return {
			projectId: (serviceAccount.project_id ?? serviceAccount.projectId) as string,
			clientEmail: (serviceAccount.client_email ?? serviceAccount.clientEmail) as string,
			privateKey: (serviceAccount.private_key ?? serviceAccount.privateKey) as string,
		};
	} catch (error) {
		throw new Error('GOOGLE_CONFIG_BASE64 must contain a valid Firebase service account', { cause: error });
	}
};
