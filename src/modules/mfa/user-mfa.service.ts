import type { OTPSecretType } from './user-secret.js';
import {
	generateUserMfaSecret,
	MfaSecretError,
	parseUserMfaSecret,
} from './user-secret.js';
import {
	decryptData,
	encryptData,
} from '#platform/encryption/encryption.js';
import type { User } from '#modules/users/index.js';
import { updateUserProfile, updateUserSessions } from '#modules/users/index.js';

export type UserMfaOperations = {
	generateSecret: typeof generateUserMfaSecret;
	encrypt: typeof encryptData;
	decrypt: typeof decryptData;
	updateProfile: typeof updateUserProfile;
	updateSessions: typeof updateUserSessions;
};

const defaultUserMfaOperations: UserMfaOperations = {
	generateSecret: generateUserMfaSecret,
	encrypt: encryptData,
	decrypt: decryptData,
	updateProfile: updateUserProfile,
	updateSessions: updateUserSessions,
};

export const ensureUserMfaSecret = async (
	user: User,
	operations: Partial<UserMfaOperations> = {},
): Promise<void> => {
	if (user.profile.secret) return;
	if (!user.email) throw new MfaSecretError('USER_EMAIL_REQUIRED');

	const mfaOperations = { ...defaultUserMfaOperations, ...operations };
	const secret = mfaOperations.generateSecret(user.email);
	const profile = structuredClone(user.profile);
	profile.secret = mfaOperations.encrypt(JSON.stringify(secret));

	await mfaOperations.updateProfile(user, profile);
};

export const decryptUserMfaSecret = (
	user: User,
	operations: Pick<Partial<UserMfaOperations>, 'decrypt'> = {},
): OTPSecretType => {
	if (!user.profile.secret) throw new MfaSecretError('SECRET_MISSING');

	const { decrypt } = { ...defaultUserMfaOperations, ...operations };
	return parseUserMfaSecret(decrypt(user.profile.secret));
};

export const enableUserMfa = async (
	user: User,
	operations: Pick<Partial<UserMfaOperations>, 'updateProfile'> = {},
): Promise<void> => {
	const { updateProfile } = { ...defaultUserMfaOperations, ...operations };
	const profile = structuredClone(user.profile);
	profile.mfa_enabled = true;

	await updateProfile(user, profile);
};

export const disableUserMfa = async (
	user: User,
	operations: Pick<Partial<UserMfaOperations>, 'updateProfile'> = {},
): Promise<void> => {
	const { updateProfile } = { ...defaultUserMfaOperations, ...operations };
	const profile = structuredClone(user.profile);
	profile.mfa_enabled = false;
	profile.secret = undefined;

	await updateProfile(user, profile);
};

export const revokeUserMfa = async (
	user: User,
	operations: Pick<Partial<UserMfaOperations>, 'updateProfile' | 'updateSessions'> = {},
): Promise<void> => {
	const mfaOperations = { ...defaultUserMfaOperations, ...operations };
	await disableUserMfa(user, mfaOperations);
	await mfaOperations.updateSessions(user, []);
};
