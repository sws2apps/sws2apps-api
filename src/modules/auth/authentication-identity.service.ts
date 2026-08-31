import {
	createFirebaseAuthenticationUser,
	createFirebaseCustomToken,
	findFirebaseAuthenticationUserIdByEmail,
	getFirebaseUserDisplayName,
	verifyFirebaseIdToken,
} from '../../platform/firebase/authentication.js';

export const verifyAuthenticationToken = async (
	idToken: string,
): Promise<string | undefined> => {
	return verifyFirebaseIdToken(idToken);
};

export const getAuthenticationUserDisplayName = async (
	authenticationUserId: string,
): Promise<string> => {
	return getFirebaseUserDisplayName(authenticationUserId);
};

export const createAuthenticationToken = async (
	authenticationUserId: string,
): Promise<string> => {
	return createFirebaseCustomToken(authenticationUserId);
};

export const findAuthenticationUserIdByEmail = async (
	email: string,
): Promise<string | undefined> => {
	return findFirebaseAuthenticationUserIdByEmail(email);
};

export const createAuthenticationUser = async (
	email: string,
): Promise<string> => {
	return createFirebaseAuthenticationUser(email);
};

