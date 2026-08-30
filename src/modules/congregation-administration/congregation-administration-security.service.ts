import { decryptData } from '../../platform/encryption/encryption.js';
import { CongregationsList } from '../congregations/congregations.js';

export type CongregationAdministrationSecurityErrorCode =
	| 'CONGREGATION_NOT_FOUND'
	| 'MEMBERSHIP_REQUIRED';

export class CongregationAdministrationSecurityError extends Error {
	constructor(public readonly code: CongregationAdministrationSecurityErrorCode) {
		super(code);
		this.name = 'CongregationAdministrationSecurityError';
	}
}

const getAuthorizedCongregation = (
	congregationId: string,
	administratorId: string,
) => {
	const congregation = CongregationsList.findById(congregationId);

	if (!congregation) {
		throw new CongregationAdministrationSecurityError('CONGREGATION_NOT_FOUND');
	}

	if (!congregation.hasMember(administratorId)) {
		throw new CongregationAdministrationSecurityError('MEMBERSHIP_REQUIRED');
	}

	return congregation;
};

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

export const saveCongregationMasterKey = async (
	congregationId: string,
	administratorId: string,
	masterKey: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	await congregation.saveMasterKey(masterKey);
};

export const saveCongregationAccessCode = async (
	congregationId: string,
	administratorId: string,
	accessCode: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	await congregation.saveAccessCode(accessCode);
};

export const getCongregationMasterKey = (
	congregationId: string,
	administratorId: string,
) => {
	return getAuthorizedCongregation(congregationId, administratorId).settings.cong_master_key;
};

export const getCongregationAccessCode = (
	congregationId: string,
	administratorId: string,
) => {
	return getAuthorizedCongregation(congregationId, administratorId).settings.cong_access_code;
};
