import { getFileMetadata } from '../../platform/firebase/storage.js';

export const getUserSettingsMetadata = async (user_id: string) => {
	const userSettings = await getFileMetadata({ type: 'user', path: `${user_id}/settings.txt` });

	return userSettings?.updated || '';
};

export const getUserProfileMetadata = async (user_id: string) => {
	const userProfile = await getFileMetadata({ type: 'user', path: `${user_id}/profile.txt` });

	return userProfile?.updated || '';
};

export const getUserProfileCreatedAt = async (userId: string) => {
	const userProfile = await getFileMetadata({
		type: 'user',
		path: `${userId}/profile.txt`,
	});

	return userProfile?.timeCreated;
};

export const getUserSessionsMetadata = async (user_id: string) => {
	const userSessions = await getFileMetadata({ type: 'user', path: `${user_id}/sessions.txt` });

	return userSessions?.updated || '';
};

export const getBibleStudiesMetadata = async (user_id: string) => {
	const bibleStudies = await getFileMetadata({ type: 'user', path: `${user_id}/bible_studies.txt` });

	return bibleStudies?.updated || '';
};

export const getFieldServiceReportsMetadata = async (user_id: string) => {
	const fieldServiceReports = await getFileMetadata({ type: 'user', path: `${user_id}/field_service_reports.txt` });

	return fieldServiceReports?.updated || '';
};

export const getDelegatedFieldServiceReportsMetadata = async (user_id: string) => {
	const fieldServiceReports = await getFileMetadata({ type: 'user', path: `${user_id}/delegated_field_service_reports.txt` });

	return fieldServiceReports?.updated || '';
};

