import * as OTPAuth from 'otpauth';

import { env } from '#config/env.js';
export type OTPSecretType = {
	secret: string;
	uri: string;
	version: number;
};

export type MfaSecretErrorCode =
	| 'USER_EMAIL_REQUIRED'
	| 'SECRET_MISSING'
	| 'SECRET_INVALID';

export class MfaSecretError extends Error {
	constructor(public readonly code: MfaSecretErrorCode) {
		super(code);
		this.name = 'MfaSecretError';
	}
}

export const parseUserMfaSecret = (decryptedSecret: string | undefined): OTPSecretType => {
	if (!decryptedSecret) throw new MfaSecretError('SECRET_MISSING');

	let secretData: unknown;

	try {
		secretData = JSON.parse(decryptedSecret);
	} catch {
		throw new MfaSecretError('SECRET_INVALID');
	}

	if (!secretData || typeof secretData !== 'object' || Array.isArray(secretData)) {
		throw new MfaSecretError('SECRET_INVALID');
	}

	const { secret, uri, version } = secretData as Record<string, unknown>;
	const secretIsValid = typeof secret === 'string' && secret.length > 0;
	const uriIsValid = typeof uri === 'string' && uri.startsWith('otpauth://');
	const versionIsValid = version === 2;

	if (!secretIsValid || !uriIsValid || !versionIsValid) {
		throw new MfaSecretError('SECRET_INVALID');
	}

	return { secret, uri, version };
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
