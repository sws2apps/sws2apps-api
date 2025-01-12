import { AppRoleType, OTPSecretType, StandardRecord } from '../definition/app.js';
import { UserCongregationAssignParams, UserProfile, UserSession, UserSettings } from '../definition/user.js';
import {
	getBibleStudiesMetadata,
	getFieldServiceReportsMetadata,
	getUserAuthDetails,
	getUserDetails,
	getUserProfileMetadata,
	getUserSessionsMetadata,
	getUserSettingsMetadata,
	setUserBibleStudies,
	setUserEmail,
	setUserFieldServiceReports,
	setUserProfile,
	setUserSessions,
	setUserSettings,
} from '../services/firebase/users.js';
import { decryptData, encryptData } from '../services/encryption/encryption.js';
import { generateUserSecret } from '../utils/user_utils.js';
import { CongregationsList } from './Congregations.js';
import { BackupData } from '../definition/congregation.js';
import { getFileMetadata } from '../services/firebase/storage_utils.js';

export class User {
	id: string;
	email?: string;
	auth_provider?: string;
	profile: UserProfile;
	sessions: UserSession[];
	settings: UserSettings;
	bible_studies: StandardRecord[];
	field_service_reports: StandardRecord[];
	metadata: Record<string, string>;

	constructor(id: string) {
		this.id = id;
		this.metadata = {
			user_bible_studies: '',
			user_field_service_reports: '',
			user_settings: '',
			sessions: '',
		};
		this.profile = {
			firstname: { value: '', updatedAt: '' },
			lastname: { value: '', updatedAt: '' },
			role: 'pocket',
		};
		this.sessions = [];
		this.settings = {
			backup_automatic: '',
			data_view: '',
			hour_credits_enabled: '',
			theme_follow_os_enabled: '',
		};
		this.bible_studies = [];
		this.field_service_reports = [];
	}

	async loadDetails() {
		const data = await getUserDetails(this.id);

		this.metadata = data.metadata;

		if (data.settings) {
			this.settings = data.settings;
		}

		this.sessions = data.sessions;
		this.profile = data.profile;

		if (this.profile.role !== 'pocket') {
			const data = await getUserAuthDetails(this.profile.auth_uid!);
			this.email = data.email;
			this.auth_provider = data.auth_provider;

			if (!this.profile.createdAt) {
				this.profile.createdAt = data.createdAt;
			}
		}

		if (this.profile.role === 'pocket' && !this.profile.createdAt) {
			const path = `${this.id}/profile.txt`;
			const data = await getFileMetadata({ type: 'user', path });

			this.profile.createdAt = data?.timeCreated;
		}

		this.bible_studies = data.bible_studies;
		this.field_service_reports = data.field_service_reports;
	}

	async updateEmailAuth(auth_uid: string, email: string) {
		await setUserEmail(auth_uid, email);

		this.email = email;
	}

	async updateProfile(profile: UserProfile) {
		await setUserProfile(this.id, profile);

		this.profile = profile;
		this.metadata.user_settings = await getUserProfileMetadata(this.id);
	}

	async updateSettings(settings: UserSettings) {
		await setUserSettings(this.id, settings);

		this.settings = settings;
		this.metadata.user_settings = await getUserSettingsMetadata(this.id);
	}

	getActiveSessions(visitorid: string) {
		const result = this.sessions?.map((session) => {
			return {
				identifier: session.identifier,
				isSelf: session.visitorid === visitorid,
				ip: session.visitor_details.ip,
				country_name: session.visitor_details.ipLocation.country_name,
				device: {
					browserName: session.visitor_details.browser,
					os: session.visitor_details.os,
					isMobile: session.visitor_details.isMobile,
				},
				last_seen: session.last_seen,
			};
		});

		return result;
	}

	async updateSessions(sessions: UserSession[]) {
		await setUserSessions(this.id, sessions);

		this.sessions = sessions;
		this.metadata.sessions = await getUserSessionsMetadata(this.id);
	}

	async revokeSession(identifier: string) {
		const revokedSession = this.sessions.find((record) => record.identifier === identifier)!;

		const sessions = this.sessions.filter((record) => record.identifier !== identifier);

		await this.updateSessions(sessions);

		return this.getActiveSessions(revokedSession.visitorid);
	}

	async enableMFA() {
		const data = structuredClone(this.profile);
		data.mfa_enabled = true;

		await this.updateProfile(data);

		this.profile.mfa_enabled = true;
	}

	async logout(visitorId: string) {
		const session = this.sessions.find((record) => record.visitorid === visitorId);

		if (session) {
			await this.revokeSession(session.identifier);
		}
	}

	async adminLogout() {
		await this.updateSessions([]);
	}

	async generateSecret() {
		if (!this.profile.secret) {
			const secret = generateUserSecret(this.email!);
			const encryptedData = encryptData(JSON.stringify(secret));

			const profile = structuredClone(this.profile);
			profile.secret = encryptedData;

			await this.updateProfile(profile);

			return secret;
		}

		const decryptedData: OTPSecretType = JSON.parse(decryptData(this.profile.secret)!);
		return decryptedData;
	}

	async revokeToken() {
		const profile = structuredClone(this.profile);
		profile.secret = undefined;
		profile.mfa_enabled = false;

		await this.updateProfile(profile);

		await this.updateSessions([]);
	}

	async updateSessionLastSeen(visitorId: string) {
		const last_seen = new Date().toISOString();

		const newSessions = structuredClone(this.sessions!);
		const findSession = newSessions.find((session) => session.visitorid === visitorId)!;
		findSession.last_seen = last_seen;

		await this.updateSessions(newSessions);
	}

	async disableMFA() {
		const data = structuredClone(this.profile);
		data.mfa_enabled = false;
		data.secret = undefined;

		await this.updateProfile(data);
	}

	decryptSecret() {
		const decryptedData = decryptData(this.profile.secret!)!;
		const secret: OTPSecretType = JSON.parse(decryptedData);
		return secret;
	}

	async assignCongregation(params: UserCongregationAssignParams) {
		const profile = structuredClone(this.profile);

		profile.congregation = {
			id: params.congId,
			cong_role: params.role,
			account_type: 'vip',
		};

		if (params.firstname) {
			profile.firstname = { value: params.firstname, updatedAt: new Date().toISOString() };
		}

		if (params.lastname) {
			profile.lastname = { value: params.lastname, updatedAt: new Date().toISOString() };
		}

		if (params.person_uid) {
			profile.congregation.user_local_uid = params.person_uid;
		}

		await this.updateProfile(profile);

		const cong = CongregationsList.findById(params.congId)!;
		await cong.reloadMembers();

		return cong;
	}

	async updateCongregationDetails(
		cong_role: AppRoleType[],
		cong_person_uid: string,
		cong_person_delegates: string[],
		cong_pocket?: string
	) {
		const profile = structuredClone(this.profile);

		profile.congregation!.cong_role = cong_role;
		profile.congregation!.user_local_uid = cong_person_uid;
		profile.congregation!.user_members_delegate = cong_person_delegates;

		if (cong_pocket) {
			profile.congregation!.pocket_invitation_code = encryptData(cong_pocket);
		}

		await this.updateProfile(profile);

		const cong = CongregationsList.findById(profile.congregation!.id)!;

		cong.reloadMembers();
	}

	async deletePocketCode() {
		const profile = structuredClone(this.profile);

		profile.congregation!.pocket_invitation_code = undefined;

		await this.updateProfile(profile);

		const cong = CongregationsList.findById(profile.congregation!.id)!;

		cong.reloadMembers();

		return cong;
	}

	async removeCongregation() {
		const cong = CongregationsList.findById(this.profile.congregation!.id);

		const profile = structuredClone(this.profile);
		profile.congregation = undefined;

		await this.updateProfile(profile);

		if (cong) {
			await cong.reloadMembers();
		}
	}

	async saveFieldServiceReports(reports: StandardRecord[]) {
		await setUserFieldServiceReports(this.id, reports);
		this.field_service_reports = reports;
		this.metadata.user_field_service_reports = await getFieldServiceReportsMetadata(this.id);
	}

	async saveBibleStudies(studies: StandardRecord[]) {
		await setUserBibleStudies(this.id, studies);

		this.bible_studies = studies;
		this.metadata.user_bible_studies = await getBibleStudiesMetadata(this.id);
	}

	async saveBackup(cong_backup: BackupData, userRole: AppRoleType[]) {
		const userSettings = cong_backup.app_settings?.user_settings;

		if (userSettings) {
			const data = userSettings as Record<string, object | string>;

			const profile = structuredClone(this.profile);
			profile.firstname = data['firstname'] as UserProfile['firstname'];
			profile.lastname = data['lastname'] as UserProfile['lastname'];

			await this.updateProfile(profile);

			const settings = structuredClone(this.settings);
			settings.backup_automatic = data['backup_automatic'] as string;
			settings.data_view = data['data_view'] as string;
			settings.hour_credits_enabled = data['hour_credits_enabled'] as string;
			settings.theme_follow_os_enabled = data['theme_follow_os_enabled'] as string;

			await this.updateSettings(settings);
		}

		const isPublisher = userRole.includes('publisher');

		const userFieldServiceReports = cong_backup.user_field_service_reports;
		const userBibleStudies = cong_backup.user_bible_studies;

		if (isPublisher && userBibleStudies) {
			await this.saveBibleStudies(userBibleStudies);
		}

		if (isPublisher && userFieldServiceReports) {
			await this.saveFieldServiceReports(userFieldServiceReports);
		}
	}

	getApplications() {
		const cong = CongregationsList.findById(this.profile.congregation!.id)!;
		const person_uid = this.profile.congregation!.user_local_uid;

		return cong.ap_applications.filter((record) => record.person_uid === person_uid);
	}

	async updatePersonData(timeAway: string, emergency: string) {
		const cong = CongregationsList.findById(this.profile.congregation!.id);

		if (!cong) return;

		const persons = structuredClone(cong.persons);
		const person = persons.find((record) => record.person_uid === this.profile.congregation!.user_local_uid);

		if (!person) return;

		const personData = person.person_data as StandardRecord;
		personData.timeAway = timeAway;
		personData.emergency_contacts = emergency;

		await cong.savePersons(persons);
	}

	postReport(report: StandardRecord) {
		const cong = CongregationsList.findById(this.profile.congregation!.id);

		if (!cong) return;

		const incoming_reports = structuredClone(cong.incoming_reports);

		const findReport = incoming_reports.find(
			(record) => record.report_month === report.report_month && record.person_uid === report.person_uid
		);

		if (!findReport) {
			incoming_reports.push({ ...report, report_id: crypto.randomUUID() });
		}

		if (findReport) {
			findReport._deleted = report._deleted;
			findReport.updatedAt = report.updatedAt;
			findReport.shared_ministry = report.shared_ministry;
			findReport.hours = report.hours;
			findReport.hours_credits = report.hours;
			findReport.bible_studies = report.bible_studies;
			findReport.comments = report.comments;
		}

		cong.incoming_reports = incoming_reports;

		cong.saveIncomingReports(incoming_reports);
	}
}
