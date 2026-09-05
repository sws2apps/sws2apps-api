import { LogLevel } from '@logtail/types';

import type { AppRoleType } from '#domain/users/app-role.js';
import {
	CongregationsList,
	type Congregation,
} from '#modules/congregations/index.js';
import {
	applyUserBackup,
	updateUserCongregationPersonData,
	UsersList,
	type User,
} from '#modules/users/index.js';
import { logger } from '#platform/logging/logger.js';
import type { StandardRecord } from '../../types/standard-record.js';
import type { BackupData } from './backup.types.js';
import { discardBackupUpload } from './backup-upload-tracker.js';
import { saveCongregationBackup } from './congregation-backup.service.js';

export type BackupPersistenceOperations = {
	findCongregationById: (congregationId: string) => Congregation | undefined;
	findUserById: (userId: string) => User | undefined;
	saveCongregation: typeof saveCongregationBackup;
	updatePersonData: typeof updateUserCongregationPersonData;
	applyUserData: typeof applyUserBackup;
	discardUpload: typeof discardBackupUpload;
	logError: (message: string) => void;
};

const defaultBackupPersistenceOperations: BackupPersistenceOperations = {
	findCongregationById: (congregationId) => CongregationsList.findById(congregationId),
	findUserById: (userId) => UsersList.findById(userId),
	saveCongregation: saveCongregationBackup,
	updatePersonData: updateUserCongregationPersonData,
	applyUserData: applyUserBackup,
	discardUpload: discardBackupUpload,
	logError: (message) => logger(LogLevel.Error, message),
};

const getUserPersonData = (
	backup: BackupData,
	user: User,
): StandardRecord | undefined => {
	const localUserId = user.profile.congregation?.user_local_uid;
	if (!localUserId) return undefined;

	const userPerson = backup.persons?.find((person) => {
		return String(person.person_uid) === localUserId;
	});
	const personData = userPerson?.person_data;

	if (!personData || typeof personData !== 'object' || Array.isArray(personData)) {
		return undefined;
	}

	return personData as StandardRecord;
};

/**
 * Applies an Organized backup within the authenticated congregation and role
 * scope. Failures are contained for the asynchronous HTTP workflow, and the
 * upload buffer is always discarded when an upload identifier is supplied.
 */
export const saveUserBackupAsync = async (
	{
		congId,
		cong_backup: congregationBackup,
		userId,
		userRole,
		uploadId,
	}: {
		congId: string;
		userId: string;
		userRole: AppRoleType[];
		cong_backup: BackupData;
		uploadId?: string;
	},
	operations: Partial<BackupPersistenceOperations> = {},
) => {
	const persistence = {
		...defaultBackupPersistenceOperations,
		...operations,
	};

	try {
		const adminRole = userRole.some(
			(role) => role === 'admin' || role === 'coordinator' || role === 'secretary',
		);
		const scheduleEditor = userRole.some(
			(role) =>
				role === 'midweek_schedule' ||
				role === 'weekend_schedule' ||
				role === 'public_talk_schedule',
		);

		const congregation = persistence.findCongregationById(congId);
		const user = persistence.findUserById(userId);

		if (!congregation || user?.profile.congregation?.id !== congregation.id) {
			throw new Error('Backup user or congregation context is invalid');
		}

		await persistence.saveCongregation(congregation, congregationBackup, userRole);

		const personData = getUserPersonData(congregationBackup, user);

		if (!adminRole && !scheduleEditor && personData) {
			await persistence.updatePersonData(
				user.id,
				personData.timeAway as string,
				personData.emergency_contacts as string,
			);
		}

		await persistence.applyUserData(user, congregationBackup, userRole);
	} catch {
		persistence.logError('congregation backup could not be saved');
	} finally {
		if (uploadId) persistence.discardUpload(uploadId);
	}
};

/**
 * Applies only the Pocket user's permitted backup data. The explicit result
 * lets the caller report persistence failure without leaking its cause.
 */
export const savePocketBackupAsync = async (
	{
		cong_backup: congregationBackup,
		userId,
		userRole,
	}: {
		userId: string;
		userRole: AppRoleType[];
		cong_backup: BackupData;
	},
	operations: Partial<BackupPersistenceOperations> = {},
): Promise<{ status: 'saved' } | { status: 'failed' }> => {
	const persistence = {
		...defaultBackupPersistenceOperations,
		...operations,
	};

	try {
		const user = persistence.findUserById(userId);
		if (!user) throw new Error('Pocket backup user context is invalid');

		const personData = getUserPersonData(congregationBackup, user);

		if (personData) {
			await persistence.updatePersonData(
				user.id,
				personData.timeAway as string,
				personData.emergency_contacts as string,
			);
		}

		await persistence.applyUserData(user, congregationBackup, userRole);
		return { status: 'saved' };
	} catch {
		persistence.logError('Pocket backup could not be saved');
		return { status: 'failed' };
	}
};
