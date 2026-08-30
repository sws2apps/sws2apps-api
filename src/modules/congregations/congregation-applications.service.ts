import type { AppRoleType } from '../../domain/users/app-role.js';
import type { StandardRecord } from '../../types/standard-record.js';
import { canManageCongregationApplications } from './congregation-permissions.js';
import { CongregationsList } from './congregations.js';
import { isCongregationMember } from './congregation-members.service.js';

export type CongregationApplicationErrorCode =
	| 'CONGREGATION_NOT_FOUND'
	| 'MEMBERSHIP_REQUIRED'
	| 'APPLICATION_PERMISSION_REQUIRED';

export class CongregationApplicationError extends Error {
	constructor(public readonly code: CongregationApplicationErrorCode) {
		super(code);
		this.name = 'CongregationApplicationError';
	}
}

const getAuthorizedApplicationCongregation = (
	congregationId: string,
	userId: string,
	roles: AppRoleType[],
) => {
	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) throw new CongregationApplicationError('CONGREGATION_NOT_FOUND');
	if (!isCongregationMember(congregation, userId)) {
		throw new CongregationApplicationError('MEMBERSHIP_REQUIRED');
	}
	if (!canManageCongregationApplications(roles)) {
		throw new CongregationApplicationError('APPLICATION_PERMISSION_REQUIRED');
	}
	return congregation;
};

export const updateCongregationApplication = async (
	congregationId: string,
	userId: string,
	roles: AppRoleType[],
	application: StandardRecord,
) => {
	const congregation = getAuthorizedApplicationCongregation(congregationId, userId, roles);
	await congregation.saveApplication(application);
	return congregation.ap_applications;
};

export const deleteCongregationApplication = async (
	congregationId: string,
	userId: string,
	roles: AppRoleType[],
	requestId: string,
) => {
	const congregation = getAuthorizedApplicationCongregation(congregationId, userId, roles);
	return congregation.deleteApplication(requestId);
};
