import { decryptData } from '../../platform/encryption/encryption.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';

export type CongregationAdministrationSecurityErrorCode =
	| 'CONGREGATION_NOT_FOUND'
	| 'MEMBERSHIP_REQUIRED'
	| 'INVALID_MASTER_KEY';

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

export const deleteAuthorizedCongregation = async (
	congregationId: string,
	administratorId: string,
	providedMasterKey: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	const encryptedMasterKey = congregation.settings.cong_master_key!;

	if (!isCongregationMasterKeyValid(encryptedMasterKey, providedMasterKey)) {
		throw new CongregationAdministrationSecurityError('INVALID_MASTER_KEY');
	}

	const memberIds = congregation.members.map((member) => member.id);

	for (const memberId of memberIds) {
		await UsersList.delete(memberId);
	}

	await CongregationsList.delete(congregationId);
};
