import { AppRoleType } from './app.js';

export type UserGlobalRoleType = 'vip' | 'pocket' | 'admin';

export type UserSession = {
	mfaVerified?: boolean;
	sws_last_seen: string;
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

export type UserRecordType = {
	about: {
		auth_uid: string;
		firstname: { value: string; updatedAt: string | null };
		lastname: { value: string; updatedAt: string | null };
		role: UserGlobalRoleType;
		sessions: UserSession[];
		mfaEnabled?: boolean;
		secret?: string;
	};
	congregation?: {
		id: string;
		role: AppRoleType[];
		last_backup?: string;
		pocket_invitation_code?: string;
		user_local_uid?: string;
		user_delegates: string[];
	};
};

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
	cong_role: string[];
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
