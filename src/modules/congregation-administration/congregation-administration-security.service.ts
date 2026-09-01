import { decryptData } from '#platform/encryption/encryption.js';
import type { CongSettingsType } from '#modules/congregations/index.js';
import { CongregationsList } from '#modules/congregations/index.js';
import { deleteUser } from '#modules/users/index.js';
import { deleteCongregation } from '#modules/congregations/index.js';
import { isCongregationMember } from '#modules/congregations/index.js';

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

	if (!isCongregationMember(congregation, administratorId)) {
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

type SecuritySetting = 'cong_access_code' | 'cong_master_key';

export const updateCongregationSecuritySetting = (
	settings: CongSettingsType,
	setting: SecuritySetting,
	value: string,
): CongSettingsType => {
	const updatedSettings = structuredClone(settings);
	updatedSettings[setting] = value;

	return updatedSettings;
};

export const saveCongregationMasterKey = async (
	congregationId: string,
	administratorId: string,
	masterKey: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	const settings = updateCongregationSecuritySetting(
		congregation.settings,
		'cong_master_key',
		masterKey,
	);

	await congregation.saveSettings(settings);
};

export const saveCongregationAccessCode = async (
	congregationId: string,
	administratorId: string,
	accessCode: string,
) => {
	const congregation = getAuthorizedCongregation(congregationId, administratorId);
	const settings = updateCongregationSecuritySetting(
		congregation.settings,
		'cong_access_code',
		accessCode,
	);

	await congregation.saveSettings(settings);
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
		await deleteUser(memberId);
	}

	await deleteCongregation(congregationId);
};
