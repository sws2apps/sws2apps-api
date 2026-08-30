import { createHash, timingSafeEqual } from 'node:crypto';

const hashSecret = (value: string): Buffer => {
	return createHash('sha256').update(value, 'utf8').digest();
};

export const areSecretValuesEqual = (
	expectedValue: string,
	providedValue: string,
): boolean => {
	const expectedHash = hashSecret(expectedValue);
	const providedHash = hashSecret(providedValue);

	return timingSafeEqual(expectedHash, providedHash);
};
