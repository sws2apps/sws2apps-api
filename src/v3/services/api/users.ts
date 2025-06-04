import { CongregationsList } from '../../classes/Congregations.js';
import { UsersList } from '../../classes/Users.js';
import { AppRoleType } from '../../definition/app.js';

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
