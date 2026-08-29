import { CongregationsList } from '../../v3/classes/Congregations.js';
import { UsersList } from '../../v3/classes/Users.js';
import type { UserSession } from '../users/user.types.js';

export const formatAdministrationSession = (
	session: UserSession,
	currentVisitorId: string,
) => {
	return {
		identifier: session.identifier,
		isSelf: session.visitorid === currentVisitorId,
		ip: session.visitor_details.ip,
		country_name: session.visitor_details.ipLocation.country_name,
		device: {
			browserName: session.visitor_details.browser,
			os: session.visitor_details.os,
			isMobile: session.visitor_details.isMobile,
		},
		last_seen: session.last_seen,
	};
};

export const getAdministrationUsers = (currentVisitorId: string) => {
	return UsersList.list.map((user) => {
		const congregationId = user.profile.congregation?.id || '';
		const congregation = CongregationsList.findById(congregationId);
		const sessions = user.sessions?.map((session) =>
			formatAdministrationSession(session, currentVisitorId),
		);

		return {
			id: user.id,
			sessions: sessions || [],
			profile: {
				...user.profile,
				email: user.email,
				mfa_enabled: user.profile.mfa_enabled,
				global_role: user.profile.role,
				role: undefined,
				congregation: {
					...user.profile.congregation,
					country_code: congregation?.settings.country_code || '',
					cong_name: congregation?.settings.cong_name || '',
					cong_prefix: congregation?.settings.cong_prefix,
					cong_number: congregation?.settings.cong_number?.value || '',
				},
			},
		};
	});
};
