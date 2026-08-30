import type { AppRoleType } from '../../domain/users/app-role.js';
import type { StandardRecord } from '../../types/standard-record.js';
import type {
	UserProfile,
	UserSession,
	UserSettings,
} from './user.types.js';
import {
	getBibleStudiesMetadata,
	getDelegatedFieldServiceReports,
	getDelegatedFieldServiceReportsMetadata,
	getUserBibleStudies,
	getFieldServiceReportsMetadata,
	getUserDetails,
	getUserFieldServiceReports,
	getUserProfileCreatedAt,
	getUserProfileMetadata,
	getUserSessionsMetadata,
	getUserSettingsMetadata,
	setDelegatedFieldServiceReports,
	setUserBibleStudies,
	setUserFieldServiceReports,
	setUserFlags,
	setUserProfile,
	setUserSessions,
	setUserSettings,
} from './users.repository.js';
import { BackupData } from '../backups/backup.types.js';

export class User {
	id: string;
	email?: string;
	auth_provider?: string;
	profile: UserProfile;
	sessions: UserSession[];
	settings: UserSettings;
	metadata: Record<string, string>;
	flags: string[];

	constructor(id: string) {
		this.id = id;
		this.metadata = {
			user_bible_studies: '',
			user_field_service_reports: '',
			delegated_field_service_reports: '',
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
		this.flags = [];
	}

	async loadDetails() {
		const data = await getUserDetails(this.id);

		this.metadata = data.metadata;

		if (data.settings) {
			this.settings = data.settings;
		}

		this.sessions = data.sessions;
		this.profile = data.profile;

		if (this.profile.role === 'pocket' && !this.profile.createdAt) {
			this.profile.createdAt = await getUserProfileCreatedAt(this.id);
		}

		this.flags = data.flags;
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

	async logout(visitorId: string) {
		const session = this.sessions.find((record) => record.visitorid === visitorId);

		if (session) {
			await this.revokeSession(session.identifier);
		}
	}

	async adminLogout() {
		await this.updateSessions([]);
	}

	async saveFieldServiceReports(reports: StandardRecord[]) {
		await setUserFieldServiceReports(this.id, reports);
		this.metadata.user_field_service_reports = await getFieldServiceReportsMetadata(this.id);
	}

	async saveBibleStudies(studies: StandardRecord[]) {
		await setUserBibleStudies(this.id, studies);
		this.metadata.user_bible_studies = await getBibleStudiesMetadata(this.id);
	}

	async saveDelegatedFieldServiceReports(reports: StandardRecord[]) {
		await setDelegatedFieldServiceReports(this.id, reports);
		this.metadata.delegated_field_service_reports = await getDelegatedFieldServiceReportsMetadata(this.id);
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
		const delegatedFieldServiceReports = cong_backup.delegated_field_service_reports;

		if (isPublisher && userBibleStudies) {
			await this.saveBibleStudies(userBibleStudies);
		}

		if (isPublisher && userFieldServiceReports) {
			await this.saveFieldServiceReports(userFieldServiceReports);
		}

		if (isPublisher && delegatedFieldServiceReports) {
			await this.saveDelegatedFieldServiceReports(delegatedFieldServiceReports);
		}
	}

	async updateFlags(flags: string[]) {
		await setUserFlags(this.id, flags);
		this.flags = flags;
	}

	async getFieldServiceReports() {
		return getUserFieldServiceReports(this.id);
	}

	async getBibleStudies() {
		return getUserBibleStudies(this.id);
	}

	async getDelegatedFieldServiceReports() {
		return getDelegatedFieldServiceReports(this.id);
	}
}
