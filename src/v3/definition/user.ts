import { AppRoleType } from './app.js';

export type UserGlobalRoleType = 'vip' | 'pocket' | 'admin';

export type UserNewParams = {
	auth_uid: string;
	firstname: string;
	lastname: string;
	email?: string;
};

export type PocketNewParams = {
	user_firstname: string;
	user_lastname: string;
	user_secret_code: string;
	cong_id: string;
	cong_role: AppRoleType[];
	cong_person_uid: string;
};

export type CongregationUserParams = {
	user_firstname: string;
	user_lastname: string;
	user_id: string;
	cong_id: string;
	cong_role: string[];
	cong_person_uid: string;
};

export type RequestPasswordLessLinkParams = {
	email: string;
	language: string;
	origin: string;
};

export type UserCongregationAssignParams = {
	congId: string;
	role: AppRoleType[];
	firstname?: string;
	lastname?: string;
	person_uid?: string;
};

export type UserCongregationAssignDbParams = UserCongregationAssignParams & {
	userId: string;
};

export type UserCongregationDetailsType = {
	userId: string;
	cong_role: AppRoleType[];
	cong_person_uid: string;
	cong_person_delegates: string[];
	cong_pocket?: string;
};

export type UserSettings = {
	backup_automatic: string;
	theme_follow_os_enabled: string;
	hour_credits_enabled: string;
	data_view: string;
};

export type UserProfile = {
	auth_uid?: string;
	email?: string;
	firstname: { value: string; updatedAt: string };
	lastname: { value: string; updatedAt: string };
	role: UserGlobalRoleType;
	mfa_enabled?: boolean;
	secret?: string;
	auth_provider?: string;
	congregation?: {
		id: string;
		cong_role: AppRoleType[];
		account_type: string;
		user_local_uid?: string;
		user_members_delegate?: string[];
		pocket_invitation_code?: string;
	};
};

export type UserSession = {
	mfaVerified?: boolean;
	last_seen: string;
	visitor_details: {
		browser: string;
		ip: string;
		ipLocation: {
			city: string;
			continent_code: string;
			country_code: string;
			country_name: string;
			timezone: string | string[];
		};
		isMobile: boolean;
		os: string;
	};
	visitorid: string;
	identifier: string;
};

export type UserAuthResponse = {
	id: string;
	firstname: { value: string; updatedAt: string };
	lastname: { value: string; updatedAt: string };
	global_role: string;
	mfa: string;
	country_code?: string;
	cong_name?: string;
	cong_number?: string;
	cong_role?: AppRoleType[];
	cong_id?: string;
	user_local_uid?: string;
	cong_master_key?: string;
	cong_access_code?: string;
	message?: string;
};
