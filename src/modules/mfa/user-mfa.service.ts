import type { OTPSecretType } from './user-secret.js';
import { generateUserMfaSecret } from './user-secret.js';
import {
	decryptData,
	encryptData,
} from '../../platform/encryption/encryption.js';
import type { User } from '../users/index.js';

export const ensureUserMfaSecret = async (user: User): Promise<void> => {
	if (user.profile.secret) return;

	const secret = generateUserMfaSecret(user.email!);
	const profile = structuredClone(user.profile);
	profile.secret = encryptData(JSON.stringify(secret));

	await user.updateProfile(profile);
};

export const decryptUserMfaSecret = (user: User): OTPSecretType => {
	const decryptedSecret = decryptData(user.profile.secret!)!;

	return JSON.parse(decryptedSecret) as OTPSecretType;
};

export const enableUserMfa = async (user: User): Promise<void> => {
	const profile = structuredClone(user.profile);
	profile.mfa_enabled = true;

	await user.updateProfile(profile);
};

export const disableUserMfa = async (user: User): Promise<void> => {
	const profile = structuredClone(user.profile);
	profile.mfa_enabled = false;
	profile.secret = undefined;

	await user.updateProfile(profile);
};

export const revokeUserMfa = async (user: User): Promise<void> => {
	await disableUserMfa(user);
	await user.updateSessions([]);
};
