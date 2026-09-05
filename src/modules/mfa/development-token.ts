import * as OTPAuth from 'otpauth';

import { decryptData } from '#platform/encryption/encryption.js';
import { parseUserMfaSecret } from './user-secret.js';

export const generateDevelopmentMfaToken = (
	userIdentifier: string,
	encryptedUserSecret: string,
): string => {
	const decryptedSecret = decryptData(encryptedUserSecret);
	const { secret } = parseUserMfaSecret(decryptedSecret);

	const tokenGenerator = new OTPAuth.TOTP({
		issuer: 'sws2apps-test',
		label: userIdentifier,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(secret),
	});

	return tokenGenerator.generate();
};
