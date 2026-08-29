import * as OTPAuth from 'otpauth';

import { env } from '../../config/env.js';
export type OTPSecretType = {
	secret: string;
	uri: string;
	version: number;
};

export const generateUserMfaSecret = (userEmail: string): OTPSecretType => {
	const base32Secret = new OTPAuth.Secret().base32;
	const issuer = env.isProduction ? 'sws2apps' : 'sws2apps-test';

	const tokenGenerator = new OTPAuth.TOTP({
		issuer,
		label: userEmail,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(base32Secret),
	});

	return {
		secret: base32Secret,
		uri: tokenGenerator.toString(),
		version: 2,
	};
};
