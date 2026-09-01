import { schemaUserProfile } from './default-user-profile.js';
import {
	getFileFromStorage,
	uploadFileToStorage,
} from '#platform/firebase/storage.js';
import type {
	UserProfile,
	UserSession,
	UserSettings,
} from './user.types.js';

export const getUserSettings = async (id: string) => {
	const path = `${id}/settings.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (data) {
		const settings = JSON.parse(data) as UserSettings;
		return settings;
	}
};

export const getUserFlags = async (id: string) => {
	const path = `${id}/flags.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (data) {
		const flags = JSON.parse(data) as string[];
		return flags;
	}

	return [];
};

export const getUserProfile = async (id: string) => {
	const path = `${id}/profile.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (!data) return structuredClone(schemaUserProfile);

	const profile = JSON.parse(data!) as UserProfile;
	return profile;
};

export const getUserSessions = async (id: string) => {
	const path = `${id}/sessions.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (data) {
		const sessions = JSON.parse(data) as UserSession[];
		return sessions;
	}

	return [];
};

export const setUserProfile = async (id: string, profile: UserProfile) => {
	const data = JSON.stringify(profile);
	const path = `${id}/profile.txt`;

	await uploadFileToStorage(data, { type: 'user', path });
};

export const setUserSettings = async (id: string, settings: UserSettings) => {
	const data = JSON.stringify(settings);
	const path = `${id}/settings.txt`;

	await uploadFileToStorage(data, { type: 'user', path });
};

export const setUserSessions = async (id: string, sessions: UserSession[]) => {
	const data = JSON.stringify(sessions);
	const path = `${id}/sessions.txt`;

	await uploadFileToStorage(data, { type: 'user', path });
};

export const setUserFlags = async (id: string, flags: string[]) => {
	const data = JSON.stringify(flags);
	const path = `${id}/flags.txt`;

	await uploadFileToStorage(data, { type: 'user', path });
};
