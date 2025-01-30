import { CongregationsList } from '../../classes/Congregations.js';
import { UsersList } from '../../classes/Users.js';

export const adminUsersGet = async () => {
	const users = UsersList.list;

	const result = users.map((user) => {
		const congId = user.profile.congregation?.id || '';
		const cong = CongregationsList.findById(congId);

		return {
			id: user.id,
			sessions: user.sessions,
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
