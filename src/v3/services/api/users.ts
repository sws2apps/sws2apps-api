import { UsersList } from '../../classes/Users.js';

export const adminUsersGet = async () => {
	const users = UsersList.list;

	const result = users.map((user) => {
		return {
			id: user.id,
			sessions: user.sessions,
			profile: { ...user.profile, email: user?.email, mfa_enabled: user?.profile.mfa_enabled },
		};
	});

	return result;
};
