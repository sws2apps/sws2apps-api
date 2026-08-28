import { AppRoleType, StandardRecord } from '../../definition/app.js';
import { BackupData } from '../../definition/congregation.js';
import { CongregationsList } from '../../classes/Congregations.js';
import { UsersList } from '../../classes/Users.js';
import { logger } from '../../../platform/logging/logger.js';
import { LogLevel } from '@logtail/types';
import { findBackupUploadByCongregation } from '../../../modules/backups/backup-upload-tracker.js';
import { backupUploadsInProgress } from '../../../platform/runtime/backup-uploads.js';

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
		const adminRole = userRole.some((role) => role === 'admin' || role === 'coordinator' || role === 'secretary');

		const scheduleEditor = userRole.some(
			(role) => role === 'midweek_schedule' || role === 'weekend_schedule' || role === 'public_talk_schedule'
		);

		const cong = CongregationsList.findById(congId)!;
		const user = UsersList.findById(userId)!;

		await cong.saveBackup(cong_backup, userRole);

		const userPerson = cong_backup.persons?.at(0);

		if (!adminRole && !scheduleEditor && userPerson) {
			const personData = userPerson.person_data as StandardRecord;
			await user.updatePersonData(personData.timeAway as string, personData.emergency_contacts as string);
		}

		await user.saveBackup(cong_backup, userRole);

		const currentBackup = findBackupUploadByCongregation(congId);

		if (currentBackup) {
			const findBackup = currentBackup.record;

			clearTimeout(findBackup.timeout);
			backupUploadsInProgress.delete(currentBackup.uploadId);
		}
	} catch (error) {
		logger(LogLevel.Error, `backup user saving error: ${String(error)}`, { congregationId: congId, userId });
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
			await user.updatePersonData(personData.timeAway as string, personData.emergency_contacts as string);
		}

		await user.saveBackup(cong_backup, userRole);
	} catch (error) {
		logger(LogLevel.Error, `backup pocket saving error: ${String(error)}`, {
			congregationId: user.profile.congregation?.id,
			userId,
		});
	}
};
