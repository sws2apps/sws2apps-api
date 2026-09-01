import type { AppRoleType } from '#domain/users/app-role.js';
import type { StandardRecord } from '../../types/standard-record.js';
import type { Congregation } from './congregation.js';
import { canManageCongregationApplications } from './congregation-permissions.js';
import { CongregationsList } from './congregations.js';
import { isCongregationMember } from './congregation-members.service.js';
import {
	deleteCongregationApplicationRecord,
	saveCongregationApplicationRecord,
} from './congregation-applications.repository.js';

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

export const synchronizeCongregationApplication = (
	applications: StandardRecord[],
	application: StandardRecord,
): StandardRecord[] => {
	const synchronizedApplications = structuredClone(applications);
	let currentApplication = synchronizedApplications.find(
		(record) => record.request_id === application.request_id,
	);

	if (!currentApplication) {
		currentApplication = { request_id: application.request_id };
		synchronizedApplications.push(currentApplication);
	}

	Object.assign(currentApplication, {
		person_uid: application.person_uid,
		months: application.months,
		continuous: application.continuous,
		submitted: application.submitted,
		status: application.status,
		coordinator: application.coordinator,
		secretary: application.secretary,
		service_overseer: application.service_overseer,
		notified: application.notified,
		expired: application.expired,
		updatedAt: application.updatedAt,
	});

	return synchronizedApplications;
};

export const saveCongregationApplication = async (
	congregation: Congregation,
	application: StandardRecord,
): Promise<void> => {
	await saveCongregationApplicationRecord(congregation.id, application);

	congregation.ap_applications = synchronizeCongregationApplication(
		congregation.ap_applications,
		application,
	);

	const currentDate = new Date().toISOString();
	const expiredApplications = congregation.ap_applications.filter((record) => {
		return typeof record.expired === 'string' && record.expired < currentDate;
	});

	for (const expiredApplication of expiredApplications) {
		await deleteCongregationApplicationRecord(
			congregation.id,
			expiredApplication.request_id as string,
		);

		congregation.ap_applications = congregation.ap_applications.filter(
			(record) => record.request_id !== expiredApplication.request_id,
		);
	}
};

export const removeCongregationApplication = async (
	congregation: Congregation,
	requestId: string,
): Promise<StandardRecord[]> => {
	await deleteCongregationApplicationRecord(congregation.id, requestId);

	congregation.ap_applications = congregation.ap_applications.filter(
		(record) => record.request_id !== requestId,
	);

	return congregation.ap_applications;
};

export const updateCongregationApplication = async (
	congregationId: string,
	userId: string,
	roles: AppRoleType[],
	application: StandardRecord,
) => {
	const congregation = getAuthorizedApplicationCongregation(congregationId, userId, roles);
	await saveCongregationApplication(congregation, application);
	return congregation.ap_applications;
};

export const deleteCongregationApplication = async (
	congregationId: string,
	userId: string,
	roles: AppRoleType[],
	requestId: string,
) => {
	const congregation = getAuthorizedApplicationCongregation(congregationId, userId, roles);
	return removeCongregationApplication(congregation, requestId);
};
