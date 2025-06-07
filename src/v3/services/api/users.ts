import { AppRoleType, StandardRecord } from '../../definition/app.js';
import { BackupData } from '../../definition/congregation.js';
import { CongregationsList } from '../../classes/Congregations.js';
import { UsersList } from '../../classes/Users.js';
import { logger } from '../logger/logger.js';
import { LogLevel } from '@logtail/types';

export const adminUsersGet = async (visitorid: string) => {
	const users = UsersList.list;

	const result = users.map((user) => {
		const congId = user.profile.congregation?.id || '';
		const cong = CongregationsList.findById(congId);

		return {
			id: user.id,
			sessions:
				user.sessions?.map((session) => {
					return {
						identifier: session.identifier,
						isSelf: session.visitorid === visitorid,
						ip: session.visitor_details.ip,
						country_name: session.visitor_details.ipLocation.country_name,
						device: {
							browserName: session.visitor_details.browser,
							os: session.visitor_details.os,
							isMobile: session.visitor_details.isMobile,
						},
						last_seen: session.last_seen,
					};
				}) || [],
			profile: {
				...user.profile,
				email: user.email,
				mfa_enabled: user.profile.mfa_enabled,
				global_role: user.profile.role,
				role: undefined,
				congregation: {
					...user.profile.congregation,
					country_code: cong?.settings.country_code || '',
					cong_name: cong?.settings.cong_name || '',
					cong_number: cong?.settings.cong_number || '',
				},
			},
		};
	});

	return result;
};

export const getUserRoles = (userRole: AppRoleType[]) => {
	const secretaryRole = userRole.includes('secretary');
	const coordinatorRole = userRole.includes('coordinator');
	const adminRole = userRole.includes('admin') || secretaryRole || coordinatorRole;

	const serviceCommiteeRole = adminRole || userRole.includes('service_overseer');

	const groupOverseerRole = adminRole || userRole.includes('group_overseers');

	const languageGroupOverseerRole = adminRole || userRole.includes('language_group_overseers');

	const elderRole = adminRole || userRole.includes('elder');

	const reportEditorRole = elderRole || languageGroupOverseerRole || groupOverseerRole;

	const scheduleEditor =
		adminRole ||
		languageGroupOverseerRole ||
		userRole.some((role) => role === 'midweek_schedule' || role === 'weekend_schedule' || role === 'public_talk_schedule');

	const personViewer = scheduleEditor || groupOverseerRole || languageGroupOverseerRole || elderRole;

	const publicTalkEditor = adminRole || languageGroupOverseerRole || userRole.some((role) => role === 'public_talk_schedule');

	const attendanceTracker = adminRole || languageGroupOverseerRole || userRole.some((role) => role === 'attendance_tracking');

	const isPublisher = userRole.includes('publisher');

	const personMinimal = !personViewer;

	return {
		secretaryRole,
		coordinatorRole,
		adminRole,
		groupOverseerRole,
		languageGroupOverseerRole,
		elderRole,
		reportEditorRole,
		scheduleEditor,
		personViewer,
		publicTalkEditor,
		attendanceTracker,
		isPublisher,
		personMinimal,
		serviceCommiteeRole,
	};
};

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
