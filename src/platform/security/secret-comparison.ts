import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_SALT_BYTES = 16;
const SCRYPT_KEY_BYTES = 32;

// Memory-hard scrypt parameters tuned for short-lived one-time passwords.
// N=16384, r=8, p=1 keeps each derivation in the tens of milliseconds while
// making the 6-digit OTP space impractical to brute force within its validity.
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;

/**
 * Derives a salted, memory-hard digest for a password-like value. The returned
 * string embeds the random salt, so verification stays stateless and the plain
 * value is never stored at rest.
 */
export const hashSecretValue = (value: string): string => {
	const salt = randomBytes(SCRYPT_SALT_BYTES);
	const derivedKey = scryptSync(value, salt, SCRYPT_KEY_BYTES, SCRYPT_OPTIONS);

	return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
};

/**
 * Compares a provided value against a digest created by `hashSecretValue` in
 * constant time. Malformed or wrong-length digests never match, and the
 * provided value never reaches a length-based comparison path.
 */
export const isSecretValueMatchingHash = (
	secretHash: string,
	providedValue: string,
): boolean => {
	const separatorIndex = secretHash.indexOf(':');
	if (separatorIndex === -1) return false;

	const salt = Buffer.from(secretHash.slice(0, separatorIndex), 'hex');
	const expectedKey = Buffer.from(secretHash.slice(separatorIndex + 1), 'hex');

	if (salt.length !== SCRYPT_SALT_BYTES || expectedKey.length !== SCRYPT_KEY_BYTES) {
		return false;
	}

	const providedKey = scryptSync(
		providedValue,
		salt,
		SCRYPT_KEY_BYTES,
		SCRYPT_OPTIONS,
	);

	return timingSafeEqual(expectedKey, providedKey);
};