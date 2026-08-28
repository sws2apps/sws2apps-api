import { AppRoleType } from '../../v3/definition/app.js';

export const getUserCapabilities = (userRoles: readonly AppRoleType[]) => {
	const secretaryRole = userRoles.includes('secretary');
	const coordinatorRole = userRoles.includes('coordinator');
	const adminRole = userRoles.includes('admin') || secretaryRole || coordinatorRole;

	const serviceCommiteeRole = adminRole || userRoles.includes('service_overseer');
	const groupOverseerRole = adminRole || userRoles.includes('group_overseers');
	const languageGroupOverseerRole = adminRole || userRoles.includes('language_group_overseers');
	const elderRole = adminRole || userRoles.includes('elder');

	const reportEditorRole = elderRole || languageGroupOverseerRole || groupOverseerRole;
	const scheduleEditor =
		adminRole ||
		languageGroupOverseerRole ||
		userRoles.some((role) =>
			['midweek_schedule', 'weekend_schedule', 'public_talk_schedule'].includes(role),
		);
	const personViewer = scheduleEditor || groupOverseerRole || languageGroupOverseerRole || elderRole;
	const publicTalkEditor =
		adminRole ||
		languageGroupOverseerRole ||
		userRoles.includes('public_talk_schedule');
	const attendanceTracker =
		adminRole ||
		languageGroupOverseerRole ||
		userRoles.includes('attendance_tracking');
	const isPublisher = userRoles.includes('publisher');
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
