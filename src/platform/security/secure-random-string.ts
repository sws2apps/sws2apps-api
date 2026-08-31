import { randomInt } from 'node:crypto';

export const NUMERIC_CHARACTERS = '0123456789';
export const UPPERCASE_ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const generateSecureRandomString = (
	length: number,
	characters: string,
): string => {
	if (!Number.isInteger(length) || length < 1) {
		throw new RangeError('Random string length must be a positive integer');
	}

	if (characters.length < 2) {
		throw new RangeError('Random string character set must contain at least two characters');
	}

	let result = '';
	for (let index = 0; index < length; index++) {
		result += characters[randomInt(0, characters.length)];
	}

	return result;
};
