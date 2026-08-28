const bearerTokenPattern = /^Bearer ([^\s]+)$/;

export const extractBearerToken = (authorizationHeader: string): string | undefined => {
	const match = bearerTokenPattern.exec(authorizationHeader);
	return match?.[1];
};

export const validateBearerAuthorization = (authorizationHeader: string): true => {
	const token = extractBearerToken(authorizationHeader);

	if (!token) {
		throw new Error('Invalid token format');
	}

	if (token === 'undefined') {
		throw new Error('Token is missing');
	}

	return true;
};
