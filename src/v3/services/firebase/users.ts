import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { StandardRecord } from '../../definition/app.js';
import { PocketNewParams, UserNewParams, UserProfile, UserSession, UserSettings } from '../../definition/user.js';
import { getFileFromStorage, uploadFileToStorage } from './storage_utils.js';
import { User } from '../../classes/User.js';
import { encryptData } from '../encryption/encryption.js';

export const getUserAuthDetails = async (auth_uid: string) => {
	const userRecord = await getAuth().getUser(auth_uid);

	const auth_provider = userRecord.providerData[0]?.providerId || 'email';

	return { email: userRecord.email, auth_provider, createdAt: userRecord.metadata.creationTime };
};

export const getUsersID = async () => {
	const pattern = '^v3\\/users\\/(.+?)\\/';

	const [files] = await getStorage().bucket().getFiles({ prefix: 'v3/users' });

	const draftUsers = files.filter((file) => {
		const rgExp = new RegExp(pattern, 'g');
		return rgExp.test(file.name);
	});

	const formatted = draftUsers.map((file) => {
		const rgExp = new RegExp(pattern, 'g');

		return rgExp.exec(file.name)![1];
	});

	const users = Array.from(new Set(formatted));

	return users;
};

export const getUserSettings = async (id: string) => {
	const path = `${id}/settings.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (data) {
		const settings = JSON.parse(data) as UserSettings;
		return settings;
	}
};

export const getUserProfile = async (id: string) => {
	const path = `${id}/profile.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

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

export const getUserBibleStudies = async (id: string) => {
	const path = `${id}/bible_studies.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (data) {
		const studies = JSON.parse(data) as StandardRecord[];
		return studies;
	}

	return [];
};

export const setUserBibleStudies = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/bible_studies.txt`;
	await uploadFileToStorage(data, { type: 'user', path });
};

export const getUserFieldServiceReports = async (id: string) => {
	const path = `${id}/field_service_reports.txt`;
	const data = await getFileFromStorage({ type: 'user', path });

	if (data) {
		const reports = JSON.parse(data) as StandardRecord[];
		return reports;
	}

	return [];
};

export const setUserFieldServiceReports = async (id: string, reports: StandardRecord[]) => {
	const data = JSON.stringify(reports);
	const path = `${id}/field_service_reports.txt`;
	await uploadFileToStorage(data, { type: 'user', path });
};

export const getUserDetails = async (id: string) => {
	return {
		settings: await getUserSettings(id),
		profile: await getUserProfile(id),
		sessions: await getUserSessions(id),
		bible_studies: await getUserBibleStudies(id),
		field_service_reports: await getUserFieldServiceReports(id),
	};
};

export const loadAllUsers = async () => {
	const users = await getUsersID();

	const result: User[] = [];

	for await (const record of users) {
		const user = new User(record);
		await user.loadDetails();

		result.push(user);
	}

	return result;
};

export const setUserEmail = async (auth_uid: string, email: string) => {
	await getAuth().updateUser(auth_uid, { email });
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

export const createUser = async (params: UserNewParams) => {
	if (params.email) {
		await getAuth().updateUser(params.auth_uid, { email: params.email });
	}

	const id = crypto.randomUUID().toUpperCase();

	const profile: UserProfile = {
		firstname: { value: params.firstname, updatedAt: new Date().toISOString() },
		lastname: { value: params.lastname, updatedAt: new Date().toISOString() },
		role: 'vip',
		auth_uid: params.auth_uid,
		createdAt: new Date().toISOString(),
	};

	await setUserProfile(id, profile);

	return id;
};

export const createPocketUser = async ({
	cong_id,
	cong_person_uid,
	cong_role,
	user_firstname,
	user_lastname,
	user_secret_code,
}: PocketNewParams) => {
	const profile: UserProfile = {
		createdAt: new Date().toISOString(),
		firstname: { value: user_firstname, updatedAt: new Date().toISOString() },
		lastname: { value: user_lastname, updatedAt: new Date().toISOString() },
		role: 'pocket',
		congregation: {
			account_type: 'pocket',
			cong_role: cong_role,
			id: cong_id,
			pocket_invitation_code: encryptData(user_secret_code),
			user_local_uid: cong_person_uid,
			user_members_delegate: [],
		},
	};

	const id = crypto.randomUUID().toUpperCase();
	await setUserProfile(id, profile);

	return id;
};

export const decodeUserIdToken = async (token: string) => {
	try {
		const decodedToken = await getAuth().verifyIdToken(token);
		return decodedToken.uid;
	} catch (err) {
		console.error('Failed to decode idToken', err);
	}
};

export const deleteAuthUser = async (uid: string) => {
	await getAuth().deleteUser(uid);
};
