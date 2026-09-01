import { saveAndRefresh } from '#domain/persistence/save-and-refresh.js';
import type { StandardRecord } from '../../../types/standard-record.js';
import type { User } from '../user.js';
import type { UserProfile, UserSession, UserSettings } from '../types/user.types.js';
import {
	setUserProfile,
	setUserSessions,
	setUserSettings,
} from '../repositories/user-account.repository.js';
import {
	getDelegatedFieldServiceReports,
	getUserBibleStudies,
	getUserFieldServiceReports,
	setDelegatedFieldServiceReports,
	setUserBibleStudies,
	setUserFieldServiceReports,
} from '../repositories/user-activity.repository.js';
import {
	getBibleStudiesMetadata,
	getDelegatedFieldServiceReportsMetadata,
	getFieldServiceReportsMetadata,
	getUserProfileMetadata,
	getUserSessionsMetadata,
	getUserSettingsMetadata,
} from '../repositories/user-metadata.repository.js';

export const updateUserProfile = (user: User, profile: UserProfile) => {
	return saveAndRefresh({
		save: () => setUserProfile(user.id, profile),
		updateLocalState: () => {
			user.profile = profile;
		},
		refreshMetadata: async () => {
			user.metadata.user_settings = await getUserProfileMetadata(user.id);
		},
	});
};

export const updateUserSettings = (user: User, settings: UserSettings) => {
	return saveAndRefresh({
		save: () => setUserSettings(user.id, settings),
		updateLocalState: () => {
			user.settings = settings;
		},
		refreshMetadata: async () => {
			user.metadata.user_settings = await getUserSettingsMetadata(user.id);
		},
	});
};

export const updateUserSessions = (user: User, sessions: UserSession[]) => {
	return saveAndRefresh({
		save: () => setUserSessions(user.id, sessions),
		updateLocalState: () => {
			user.sessions = sessions;
		},
		refreshMetadata: async () => {
			user.metadata.sessions = await getUserSessionsMetadata(user.id);
		},
	});
};

type UserActivityKey =
	| 'user_field_service_reports'
	| 'user_bible_studies'
	| 'delegated_field_service_reports';

const saveUserActivity = (
	user: User,
	records: StandardRecord[],
	metadataKey: UserActivityKey,
	save: (userId: string, records: StandardRecord[]) => Promise<void>,
	getMetadata: (userId: string) => Promise<string>,
) => {
	return saveAndRefresh({
		save: () => save(user.id, records),
		refreshMetadata: async () => {
			user.metadata[metadataKey] = await getMetadata(user.id);
		},
	});
};

export const saveUserFieldServiceReports = (user: User, reports: StandardRecord[]) => {
	return saveUserActivity(
		user,
		reports,
		'user_field_service_reports',
		setUserFieldServiceReports,
		getFieldServiceReportsMetadata,
	);
};

export const saveUserBibleStudies = (user: User, studies: StandardRecord[]) => {
	return saveUserActivity(
		user,
		studies,
		'user_bible_studies',
		setUserBibleStudies,
		getBibleStudiesMetadata,
	);
};

export const saveUserDelegatedFieldServiceReports = (user: User, reports: StandardRecord[]) => {
	return saveUserActivity(
		user,
		reports,
		'delegated_field_service_reports',
		setDelegatedFieldServiceReports,
		getDelegatedFieldServiceReportsMetadata,
	);
};

export const getUserStoredFieldServiceReports = (userId: string) =>
	getUserFieldServiceReports(userId);
export const getUserStoredBibleStudies = (userId: string) =>
	getUserBibleStudies(userId);
export const getUserStoredDelegatedFieldServiceReports = (userId: string) =>
	getDelegatedFieldServiceReports(userId);
