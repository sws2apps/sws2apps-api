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
			timezone: string;
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
		pocket_oCode?: string;
		user_local_uid?: string;
	};
};

export type UserNewParams = {
	auth_uid: string;
	firstname: string;
	lastname: string;
	email?: string;
};

export type RequestPasswordLessLinkParams = {
	email: string;
	language: string;
	origin: string;
};

export type UserCongregationAssignParams = {
	congId: string;
	role: AppRoleType[];
};

export type UserCongregationAssignDbParams = UserCongregationAssignParams & {
	userId: string;
};
