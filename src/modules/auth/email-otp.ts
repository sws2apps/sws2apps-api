import { areSecretValuesEqual } from '../../platform/security/secret-comparison.js';
import {
	generateSecureRandomString,
	NUMERIC_CHARACTERS,
} from '../../platform/security/secure-random-string.js';

type EmailOneTimePassword = {
	code: string;
	expiredAt: number;
};

export const generateEmailOneTimePassword = (): string => {
	return generateSecureRandomString(6, NUMERIC_CHARACTERS);
};

export const isEmailOneTimePasswordValid = (
	oneTimePassword: EmailOneTimePassword,
	submittedCode: string,
	currentTime = Date.now(),
) => {
	const isExpired = currentTime > oneTimePassword.expiredAt;
	if (isExpired) return false;

	return areSecretValuesEqual(oneTimePassword.code, submittedCode);
};
