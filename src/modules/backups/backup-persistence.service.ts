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
import type { BackupDataWithOptionalMetadata } from './backup.types.js';
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
	backup: BackupDataWithOptionalMetadata,
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
 * scope. Failures return an explicit outcome to the HTTP workflow, and the
 * upload buffer is always discarded when an upload identifier is supplied.
 */
export const saveUserBackupAsync = async (
	{
		congId,
		cong_backup: congregationBackup,
		userId,
		uploadId,
	}: {
		congId: string;
		userId: string;
		userRole: AppRoleType[];
		cong_backup: BackupDataWithOptionalMetadata;
		uploadId?: string;
	},
	operations: Partial<BackupPersistenceOperations> = {},
) => {
	const persistence = {
		...defaultBackupPersistenceOperations,
		...operations,
	};

	try {
		const congregation = persistence.findCongregationById(congId);
		const user = persistence.findUserById(userId);
		if (!congregation || user?.profile.congregation?.id !== congregation.id) {
			throw new Error('Backup user or congregation context is invalid');
		}
		const currentRoles = user.profile.congregation.cong_role;
		const adminRole = currentRoles.some((role) => ['admin', 'coordinator', 'secretary'].includes(role));
		const scheduleEditor = currentRoles.some((role) => ['midweek_schedule', 'weekend_schedule', 'public_talk_schedule'].includes(role));

		await persistence.saveCongregation(
			congregation,
			congregationBackup,
			currentRoles,
			undefined,
			user.profile.congregation.user_local_uid,
		);

		const personData = getUserPersonData(congregationBackup, user);

		if (!adminRole && !scheduleEditor && personData) {
			await persistence.updatePersonData(
				user.id,
				personData.timeAway as string,
				personData.emergency_contacts as string,
			);
		}

		await persistence.applyUserData(user, congregationBackup, currentRoles);
		return { status: 'saved' as const };
	} catch {
		persistence.logError('congregation backup could not be saved');
		return { status: 'failed' as const };
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
		cong_backup: BackupDataWithOptionalMetadata;
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
