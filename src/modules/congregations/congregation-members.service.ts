import { decryptData } from '../../platform/encryption/encryption.js';
import type { Congregation } from './congregation.js';
import { UsersList } from '../users/index.js';

export const isCongregationMember = (
	congregation: Congregation,
	userId: string,
): boolean => {
	const user = UsersList.findById(userId);

	return user?.profile.congregation?.id === congregation.id;
};

export const refreshCongregationMembers = (congregation: Congregation): void => {
	congregation.members = UsersList.list.filter((user) => {
		return user.profile.congregation?.id === congregation.id;
	});
};

export const getCongregationMembers = (
	congregation: Congregation,
	currentVisitorId: string,
) => {
	return congregation.members.map((member) => ({
		id: member.id,
		profile: {
			createdAt: member.profile.createdAt,
			global_role: member.profile.role,
			firstname: member.profile.firstname,
			lastname: member.profile.lastname,
			cong_role: member.profile.congregation?.cong_role,
			user_local_uid: member.profile.congregation?.user_local_uid,
			user_members_delegate: member.profile.congregation?.user_members_delegate || [],
			pocket_invitation_code:
				typeof member.profile.congregation?.pocket_invitation_code === 'string'
					? decryptData(member.profile.congregation.pocket_invitation_code)
					: undefined,
		},
		sessions: member.sessions?.map((session) => ({
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
		})) || [],
	}));
};
