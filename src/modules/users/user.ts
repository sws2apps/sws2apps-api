import type {
	UserProfile,
	UserSession,
	UserSettings,
} from './types/user.types.js';

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
}
