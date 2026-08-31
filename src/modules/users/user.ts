import type { StandardRecord } from '../../types/standard-record.js';
import type {
	UserProfile,
	UserSession,
	UserSettings,
} from './user.types.js';
import {
	setUserProfile,
	setUserSessions,
	setUserSettings,
} from './user-account.repository.js';
import {
	getDelegatedFieldServiceReports,
	getUserBibleStudies,
	getUserFieldServiceReports,
	setDelegatedFieldServiceReports,
	setUserBibleStudies,
	setUserFieldServiceReports,
} from './user-activity.repository.js';
import {
	getBibleStudiesMetadata,
	getDelegatedFieldServiceReportsMetadata,
	getFieldServiceReportsMetadata,
	getUserProfileCreatedAt,
	getUserProfileMetadata,
	getUserSessionsMetadata,
	getUserSettingsMetadata,
} from './user-metadata.repository.js';
import { getUserDetails } from './user-lifecycle.repository.js';

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

	async updateSessions(sessions: UserSession[]) {
		await setUserSessions(this.id, sessions);

		this.sessions = sessions;
		this.metadata.sessions = await getUserSessionsMetadata(this.id);
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
