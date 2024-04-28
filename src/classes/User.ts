import { AppRoleType, OTPSecretType } from '../denifition/app.js';
import { UserCongregationAssignParams, UserGlobalRoleType, UserSession } from '../denifition/user.js';
import {
	dbUserAuthDetails,
	dbUserCongregationAssign,
	dbUserDisableMFA,
	dbUserEnableMFA,
	dbUserGenerateSecret,
	dbUserLoadDetails,
	dbUserUpdateEmail,
	dbUserUpdateFirstname,
	dbUserUpdateLastname,
	dbUserUpdateSessions,
} from '../services/firebase/users.js';
import { dbCongregationLoadDetails } from '../services/firebase/congregations.js';
import { decryptData } from '../services/encryption/encryption_utils.js';
import { CongregationsList } from './Congregations.js';

export class User {
	id: string;
	user_email: string | undefined;
	user_local_uid: string | undefined;
	pocket_oCode: string | undefined;
	cong_id: string | undefined;
	cong_country: string;
	cong_name: string;
	cong_number: string;
	cong_role: AppRoleType[];
	mfaEnabled: boolean;
	firstname: { value: string; updatedAt: string | null };
	lastname: { value: string; updatedAt: string | null };
	global_role: UserGlobalRoleType | '';
	sessions?: UserSession[];
	last_seen: string | undefined;
	auth_uid: string;
	disabled: boolean;
	secret: string | undefined;
	auth_provider: string;
	last_backup: string | undefined;

	constructor(id: string) {
		this.id = id;
		this.user_email = '';
		this.user_local_uid = '';
		this.pocket_oCode = '';
		this.cong_id = '';
		this.cong_country = '';
		this.cong_name = '';
		this.cong_number = '';
		this.cong_role = [];
		this.mfaEnabled = false;
		this.firstname = { value: '', updatedAt: null };
		this.lastname = { value: '', updatedAt: null };
		this.global_role = '';
		this.sessions = [];
		this.last_seen = '';
		this.auth_uid = '';
		this.disabled = true;
		this.secret = '';
		this.auth_provider = '';
		this.last_backup = undefined;
	}

	async loadDetails() {
		const data = await dbUserLoadDetails(this.id);

		this.cong_id = data.congregation?.id;
		this.cong_role = data.congregation?.role || [];
		this.firstname = data.about.firstname;
		this.global_role = data.about.role;
		this.last_backup = data.congregation?.last_backup;
		this.last_seen = data.last_seen;
		this.lastname = data.about.lastname;
		this.mfaEnabled = data.about.mfaEnabled ?? false;
		this.pocket_oCode = data.congregation?.pocket_oCode;
		this.secret = data.about.secret;
		this.sessions = data.about.sessions;
		this.user_local_uid = data.congregation?.user_local_uid;
		this.auth_uid = data.about.auth_uid;

		if (this.global_role !== 'pocket') {
			const data = await dbUserAuthDetails(this.auth_uid);
			this.auth_provider = data.auth_provider;
			this.user_email = data.email;
			this.disabled = data.disabled;
		}

		if (this.cong_id) {
			const data = await dbCongregationLoadDetails(this.cong_id);
			this.cong_country = data.country_code;
			this.cong_name = data.cong_name;
			this.cong_number = data.cong_number;
		}
	}

	async updateEmailAuth(auth_uid: string, email: string) {
		await dbUserUpdateEmail(auth_uid, email);
	}

	async updateFirstname(firstname: string) {
		const data = await dbUserUpdateFirstname(this.id, firstname);
		this.firstname = { value: data.firstname, updatedAt: data.updatedAt };
	}

	async updateLastname(lastname: string) {
		const data = await dbUserUpdateLastname(this.id, lastname);
		this.lastname = { value: data.lastname, updatedAt: data.updatedAt };
	}

	getActiveSessions() {
		const result = this.sessions?.map((session) => {
			return {
				visitorid: session.visitorid,
				ip: session.visitor_details.ip,
				country_name: session.visitor_details.ipLocation.country_name,
				device: {
					browserName: session.visitor_details.browser,
					os: session.visitor_details.os,
					isMobile: session.visitor_details.isMobile,
				},
				last_seen: session.sws_last_seen,
			};
		});

		return result;
	}

	async revokeSession(visitorId: string) {
		const newSessions = this.sessions!.filter((session) => session.visitorid !== visitorId);

		await dbUserUpdateSessions(this.id, newSessions);

		this.sessions = newSessions;

		return this.getActiveSessions();
	}

	async updateSessions(sessions: UserSession[]) {
		await dbUserUpdateSessions(this.id, sessions);

		this.sessions = sessions;
	}

	async enableMFA() {
		await dbUserEnableMFA(this.id);

		this.mfaEnabled = true;
	}

	async logout(visitorId: string) {
		await this.revokeSession(visitorId);
	}

	async adminLogout() {
		await this.updateSessions([]);
	}

	async generateSecret() {
		if (!this.secret) {
			this.secret = await dbUserGenerateSecret(this.id, this.user_email!);
		}

		const decryptedData: OTPSecretType = JSON.parse(decryptData(this.secret!));
		return decryptedData;
	}

	async revokeToken() {
		this.secret = await dbUserGenerateSecret(this.id, this.user_email!);
		this.mfaEnabled = await dbUserDisableMFA(this.id);

		await this.updateSessions([]);
	}

	async updateSessionLastSeen(visitorId: string) {
		const last_seen = new Date().toISOString();

		const newSessions = structuredClone(this.sessions!);
		const findSession = newSessions.find((session) => session.visitorid === visitorId);
		findSession!['sws_last_seen'] = last_seen;

		await this.updateSessions(newSessions);
		this.last_seen = last_seen;
	}

	async disableMFA() {
		this.mfaEnabled = await dbUserEnableMFA(this.id);
		this.secret = undefined;
	}

	decryptSecret() {
		const decryptedData = decryptData(this.secret!);
		const secret: OTPSecretType = JSON.parse(decryptedData);
		return secret;
	}

	async assignCongregation(params: UserCongregationAssignParams) {
		const { congId, role } = params;

		await dbUserCongregationAssign({ congId, role, userId: this.id });
		await this.loadDetails();

		const cong = CongregationsList.findById(congId)!;
		await cong.reloadMembers();

		return cong;
	}
}
