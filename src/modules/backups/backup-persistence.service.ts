import { LogLevel } from '@logtail/types';

import { logger } from '../../platform/logging/logger.js';
import { backupUploadsInProgress } from '../../platform/runtime/backup-uploads.js';
import { CongregationsList } from '../../v3/classes/Congregations.js';
import { UsersList } from '../../v3/classes/Users.js';
import { AppRoleType, StandardRecord } from '../../v3/definition/app.js';
import { BackupData } from '../../v3/definition/congregation.js';
import { findBackupUploadByCongregation } from './backup-upload-tracker.js';

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

		await congregation.saveBackup(cong_backup, userRole);

		const userPerson = cong_backup.persons?.at(0);

		if (!adminRole && !scheduleEditor && userPerson) {
			const personData = userPerson.person_data as StandardRecord;
			await user.updatePersonData(
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
	} catch (error) {
		logger(LogLevel.Error, `backup user saving error: ${String(error)}`, {
			congregationId: congId,
			userId,
		});
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
			await user.updatePersonData(
				personData.timeAway as string,
				personData.emergency_contacts as string,
			);
		}

		await user.saveBackup(cong_backup, userRole);
	} catch (error) {
		logger(LogLevel.Error, `backup pocket saving error: ${String(error)}`, {
			congregationId: user.profile.congregation?.id,
			userId,
		});
	}
};
