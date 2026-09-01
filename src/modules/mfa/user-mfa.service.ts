import type { OTPSecretType } from './user-secret.js';
import { generateUserMfaSecret } from './user-secret.js';
import {
	decryptData,
	encryptData,
} from '#platform/encryption/encryption.js';
import type { User } from '#modules/users/index.js';
import { updateUserProfile, updateUserSessions } from '#modules/users/index.js';

export const ensureUserMfaSecret = async (user: User): Promise<void> => {
	if (user.profile.secret) return;

	const secret = generateUserMfaSecret(user.email!);
	const profile = structuredClone(user.profile);
	profile.secret = encryptData(JSON.stringify(secret));

	await updateUserProfile(user, profile);
};

export const decryptUserMfaSecret = (user: User): OTPSecretType => {
	const decryptedSecret = decryptData(user.profile.secret!)!;

	return JSON.parse(decryptedSecret) as OTPSecretType;
};

export const enableUserMfa = async (user: User): Promise<void> => {
	const profile = structuredClone(user.profile);
	profile.mfa_enabled = true;

	await updateUserProfile(user, profile);
};

export const disableUserMfa = async (user: User): Promise<void> => {
	const profile = structuredClone(user.profile);
	profile.mfa_enabled = false;
	profile.secret = undefined;

	await updateUserProfile(user, profile);
};

export const revokeUserMfa = async (user: User): Promise<void> => {
	await disableUserMfa(user);
	await updateUserSessions(user, []);
};
