import * as OTPAuth from 'otpauth';
import { OTPSecretType } from '../definition/app.js';

export const generateUserSecret = (email: string) => {
	const isProd = process.env.NODE_ENV === 'production';

	const tempSecret = new OTPAuth.Secret().base32;

	const totp = new OTPAuth.TOTP({
		issuer: isProd ? 'sws2apps' : 'sws2apps-test',
		label: email,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(tempSecret),
	});

	const secret: OTPSecretType = { secret: tempSecret, uri: totp.toString(), version: 2 };
	return secret;
};
