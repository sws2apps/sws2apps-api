import { areSecretValuesEqual } from '../../platform/security/secret-comparison.js';

type EmailOneTimePassword = {
	code: string;
	expiredAt: number;
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
