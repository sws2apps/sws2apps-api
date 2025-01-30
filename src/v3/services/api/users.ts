import { CongregationsList } from '../../classes/Congregations.js';
import { UsersList } from '../../classes/Users.js';

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
