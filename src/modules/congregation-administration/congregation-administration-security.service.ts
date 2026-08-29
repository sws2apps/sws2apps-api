import { decryptData } from '../../platform/encryption/encryption.js';

export const isCongregationMasterKeyValid = (
	encryptedMasterKey: string,
	providedMasterKey: string,
): boolean => {
	const decryptedMasterKey = decryptData(
		encryptedMasterKey,
		providedMasterKey,
	);

	return Boolean(decryptedMasterKey);
};
