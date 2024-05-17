// all db initialization for dev
import * as OTPAuth from 'otpauth';

import { decryptData } from '../services/encryption/encryption.js';

export const generateTokenDev = (userUID: string, userSecret: string) => {
	const { secret } = JSON.parse(decryptData(userSecret));
	const totp = new OTPAuth.TOTP({
		issuer: 'sws2apps-test',
		label: userUID,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(secret),
	});

	return totp.generate();
};
