import { decryptData } from '../../platform/encryption/encryption.js';

export const decryptPocketAccessCode = (
	encryptedAccessCode: string,
	temporaryAccessCode: string,
): { accessCode: string } | undefined => {
	const decryptedAccessCode = decryptData(
		encryptedAccessCode,
		temporaryAccessCode,
	);

	if (!decryptedAccessCode) {
		return undefined;
	}

	return {
		accessCode: JSON.parse(decryptedAccessCode) as string,
	};
};
