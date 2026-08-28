import { extractBearerToken } from '../../../http/security/bearer-token.js';

export const authBearerCheck = (value: string) => {
	const token = extractBearerToken(value);

	if (!token) {
		throw new Error('Invalid token format');
	}

	if (token === 'undefined') {
		throw new Error('Token is missing');
	}

	return true;
};
