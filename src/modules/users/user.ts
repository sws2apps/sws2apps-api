import type { StandardRecord } from '../../types/standard-record.js';
import type {
	UserProfile,
	UserSession,
	UserSettings,
} from './types/user.types.js';
import {
	setUserProfile,
	setUserSessions,
	setUserSettings,
} from './repositories/user-account.repository.js';
import {
	getDelegatedFieldServiceReports,
	getUserBibleStudies,
	getUserFieldServiceReports,
	setDelegatedFieldServiceReports,
	setUserBibleStudies,
	setUserFieldServiceReports,
} from './repositories/user-activity.repository.js';
import {
	getBibleStudiesMetadata,
	getDelegatedFieldServiceReportsMetadata,
	getFieldServiceReportsMetadata,
	getUserProfileCreatedAt,
	getUserProfileMetadata,
	getUserSessionsMetadata,
	getUserSettingsMetadata,
} from './repositories/user-metadata.repository.js';
import { getUserDetails } from './repositories/user-lifecycle.repository.js';
import { saveAndRefresh } from '#domain/persistence/save-and-refresh.js';

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
		await saveAndRefresh({
			save: () => setUserProfile(this.id, profile),
			updateLocalState: () => {
				this.profile = profile;
			},
			refreshMetadata: async () => {
				this.metadata.user_settings = await getUserProfileMetadata(this.id);
			},
		});
	}

	async updateSettings(settings: UserSettings) {
		await saveAndRefresh({
			save: () => setUserSettings(this.id, settings),
			updateLocalState: () => {
				this.settings = settings;
			},
			refreshMetadata: async () => {
				this.metadata.user_settings = await getUserSettingsMetadata(this.id);
			},
		});
	}

	async updateSessions(sessions: UserSession[]) {
		await saveAndRefresh({
			save: () => setUserSessions(this.id, sessions),
			updateLocalState: () => {
				this.sessions = sessions;
			},
			refreshMetadata: async () => {
				this.metadata.sessions = await getUserSessionsMetadata(this.id);
			},
		});
	}

	async saveFieldServiceReports(reports: StandardRecord[]) {
		await saveAndRefresh({
			save: () => setUserFieldServiceReports(this.id, reports),
			refreshMetadata: async () => {
				this.metadata.user_field_service_reports = await getFieldServiceReportsMetadata(this.id);
			},
		});
	}

	async saveBibleStudies(studies: StandardRecord[]) {
		await saveAndRefresh({
			save: () => setUserBibleStudies(this.id, studies),
			refreshMetadata: async () => {
				this.metadata.user_bible_studies = await getBibleStudiesMetadata(this.id);
			},
		});
	}

	async saveDelegatedFieldServiceReports(reports: StandardRecord[]) {
		await saveAndRefresh({
			save: () => setDelegatedFieldServiceReports(this.id, reports),
			refreshMetadata: async () => {
				this.metadata.delegated_field_service_reports =
					await getDelegatedFieldServiceReportsMetadata(this.id);
			},
		});
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
