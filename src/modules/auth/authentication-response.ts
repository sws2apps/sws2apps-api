import { canAccessCongregationMasterKey } from '#domain/users/master-key-roles.js';
import {
	CongregationsList,
	type Congregation,
} from '#modules/congregations/index.js';
import {
	type User,
	type UserAuthResponse,
} from '#modules/users/index.js';


type BuildUserAuthenticationResponseInput = {
	authUser: User;
	mfaStatus?: 'not_enabled' | 'enabled';
};

type AuthenticationResponseDependencies = {
	findCongregationById: (congregationId: string) => Congregation | undefined;
};

const defaultAuthenticationResponseDependencies: AuthenticationResponseDependencies = {
	findCongregationById: (congregationId) => {
		return CongregationsList.findById(congregationId);
	},
};

export const buildUserAuthenticationResponse = (
	{
		authUser,
		mfaStatus = 'not_enabled',
	}: BuildUserAuthenticationResponseInput,
	dependencies: Partial<AuthenticationResponseDependencies> = {},
): UserAuthResponse => {
	const { findCongregationById } = {
		...defaultAuthenticationResponseDependencies,
		...dependencies,
	};
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

	const congregationMembership = authUser.profile.congregation;

	if (!congregationMembership) {
		return userInfo;
	}

	const congregation = findCongregationById(congregationMembership.id);

	if (!congregation) {
		return userInfo;
	}

	const userRole = congregationMembership.cong_role;
	const masterKeyNeeded = canAccessCongregationMasterKey(userRole);

	userInfo.app_settings.user_settings.user_local_uid = congregationMembership.user_local_uid;
	userInfo.app_settings.user_settings.user_members_delegate = congregationMembership.user_members_delegate;
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
		id: congregationMembership.id,
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
