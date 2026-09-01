import { encryptData } from '#platform/encryption/encryption.js';
import {
	deleteFileFromStorage,
	listFilesFromStorage,
} from '#platform/firebase/storage.js';
import { User } from '../user.js';
import {
	getUserFlags,
	getUserProfile,
	getUserSessions,
	getUserSettings,
	setUserProfile,
} from './user-account.repository.js';
import {
	getBibleStudiesMetadata,
	getDelegatedFieldServiceReportsMetadata,
	getFieldServiceReportsMetadata,
	getUserProfileMetadata,
	getUserSessionsMetadata,
	getUserSettingsMetadata,
} from './user-metadata.repository.js';
import type {
	PocketNewParams,
	UserNewParams,
	UserProfile,
} from '../types/user.types.js';

export const deletePersistedUser = async (userId: string): Promise<void> => {
	await deleteFileFromStorage({
		type: 'user',
		path: userId,
	});
};

export const getUserIds = async () => {
	const pattern = '^v3\\/users\\/(.+?)\\/';

	const files = await listFilesFromStorage({ type: 'user', path: '' });

	const draftUsers = files.filter((file) => {
		const rgExp = new RegExp(pattern, 'g');
		return rgExp.test(file.path);
	});

	const formatted = draftUsers.map((file) => {
		const rgExp = new RegExp(pattern, 'g');

		return rgExp.exec(file.path)![1];
	});

	const users = Array.from(new Set(formatted));

	return users;
};

export const getUserDetails = async (id: string) => {
	const profile = await getUserProfileMetadata(id);
	const settings = await getUserSettingsMetadata(id);

	const user_settings = profile > settings ? profile : settings;

	return {
		settings: await getUserSettings(id),
		profile: await getUserProfile(id),
		sessions: await getUserSessions(id),
		metadata: {
			user_bible_studies: await getBibleStudiesMetadata(id),
			user_field_service_reports: await getFieldServiceReportsMetadata(id),
			delegated_field_service_reports: await getDelegatedFieldServiceReportsMetadata(id),
			sessions: await getUserSessionsMetadata(id),
			user_settings,
		},
		flags: await getUserFlags(id),
	};
};

export const loadAllUsers = async (batchSize = 20) => {
	const users = await getUserIds();
	const result: User[] = [];

	// Process in batches
	for (let i = 0; i < users.length; i += batchSize) {
		const batch = users.slice(i, i + batchSize);

		// Run all in parallel for this batch
		const loadedBatch = await Promise.all(
			batch.map(async (record) => {
				const user = new User(record);
				await user.loadDetails();
				return user;
			}),
		);

		result.push(...loadedBatch);
	}

	return result;
};

export const createPersistedUser = async (params: UserNewParams) => {
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

export const createPersistedPocketUser = async ({
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
