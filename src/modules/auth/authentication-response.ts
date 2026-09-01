import { canAccessCongregationMasterKey } from '../../domain/users/master-key-roles.js';
import { CongregationsList } from '../congregations/index.js';
import type { User } from '../users/index.js';
import type { UserAuthResponse } from '../users/index.js';

type BuildUserAuthenticationResponseInput = {
	authUser: User;
	mfaStatus?: 'not_enabled' | 'enabled';
};

export const buildUserAuthenticationResponse = ({
	authUser,
	mfaStatus = 'not_enabled',
}: BuildUserAuthenticationResponseInput): UserAuthResponse => {
	const userInfo: UserAuthResponse = {
		message: 'TOKEN_VALID',
		id: authUser.id,
		app_settings: {
			user_settings: {
				firstname: authUser.profile.firstname,
				lastname: authUser.profile.lastname,
				role: authUser.profile.role,
				mfa: mfaStatus,
			},
		},
	};

	const congregationId = authUser.profile.congregation?.id;

	if (!congregationId) {
		return userInfo;
	}

	const congregation = CongregationsList.findById(congregationId);

	if (!congregation) {
		return userInfo;
	}

	const userRole = authUser.profile.congregation!.cong_role;
	const masterKeyNeeded = canAccessCongregationMasterKey(userRole);

	userInfo.app_settings.user_settings.user_local_uid = authUser.profile.congregation!.user_local_uid;
	userInfo.app_settings.user_settings.user_members_delegate = authUser.profile.congregation!.user_members_delegate;
	userInfo.app_settings.user_settings.cong_role = userRole;

	const midweek = congregation.settings.midweek_meeting.map(({ type, time, weekday }) => ({
		type,
		time,
		weekday,
	}));
	const weekend = congregation.settings.weekend_meeting.map(({ type, time, weekday }) => ({
		type,
		time,
		weekday,
	}));

	userInfo.app_settings.cong_settings = {
		id: congregationId,
		cong_circuit: congregation.settings.cong_circuit,
		cong_name: congregation.settings.cong_name,
		cong_prefix: congregation.settings.cong_prefix,
		cong_number: congregation.settings.cong_number,
		country_code: congregation.settings.country_code,
		cong_access_code: congregation.settings.cong_access_code,
		cong_master_key: masterKeyNeeded ? congregation.settings.cong_master_key : undefined,
		cong_location: congregation.settings.cong_location,
		midweek_meeting: midweek,
		weekend_meeting: weekend,
	};

	return userInfo;
};
