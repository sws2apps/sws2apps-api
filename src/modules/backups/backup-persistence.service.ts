import { LogLevel } from '@logtail/types';

import { logger } from '../../platform/logging/logger.js';
import { backupUploadsInProgress } from '../../platform/runtime/backup-uploads.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';
import type { AppRoleType } from '../../domain/users/app-role.js';
import type { StandardRecord } from '../../types/standard-record.js';
import { BackupData } from './backup.types.js';
import { findBackupUploadByCongregation } from './backup-upload-tracker.js';
import { updateUserCongregationPersonData } from '../users/users-congregation-activity.service.js';
import { saveCongregationBackup } from './congregation-backup.service.js';

export const saveUserBackupAsync = async ({
	congId,
	cong_backup,
	userId,
	userRole,
}: {
	congId: string;
	userId: string;
	userRole: AppRoleType[];
	cong_backup: BackupData;
}) => {
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

		const congregation = CongregationsList.findById(congId)!;
		const user = UsersList.findById(userId)!;

		await saveCongregationBackup(congregation, cong_backup, userRole);

		const userPerson = cong_backup.persons?.at(0);

		if (!adminRole && !scheduleEditor && userPerson) {
			const personData = userPerson.person_data as StandardRecord;
			await updateUserCongregationPersonData(
				user.id,
				personData.timeAway as string,
				personData.emergency_contacts as string,
			);
		}

		await user.saveBackup(cong_backup, userRole);

		const currentUpload = findBackupUploadByCongregation(congId);

		if (currentUpload) {
			clearTimeout(currentUpload.record.timeout);
			backupUploadsInProgress.delete(currentUpload.uploadId);
		}
	} catch {
		logger(LogLevel.Error, 'congregation backup could not be saved');
	}
};

export const savePocketBackupAsync = async ({
	cong_backup,
	userId,
	userRole,
}: {
	userId: string;
	userRole: AppRoleType[];
	cong_backup: BackupData;
}) => {
	const user = UsersList.findById(userId)!;

	try {
		const userPerson = cong_backup.persons?.at(0);

		if (userPerson) {
			const personData = userPerson.person_data as StandardRecord;
			await updateUserCongregationPersonData(
				user.id,
				personData.timeAway as string,
				personData.emergency_contacts as string,
			);
		}

		await user.saveBackup(cong_backup, userRole);
	} catch {
		logger(LogLevel.Error, 'Pocket backup could not be saved');
	}
};
