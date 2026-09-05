const bearerTokenPattern = /^Bearer ([^\s]+)$/;

/**
 * Extracts a token only from the API's exact `Bearer <token>` wire format.
 * Keeping this parser strict prevents ambiguous authorization values from
 * reaching the authentication provider.
 */
export const extractBearerToken = (authorizationHeader: string): string | undefined => {
	const match = bearerTokenPattern.exec(authorizationHeader);
	return match?.[1];
};

/**
 * Express-validator adapter for the Authorization header. It deliberately
 * rejects the literal value `undefined`, which can be sent by misconfigured
 * clients when a token variable is missing.
 */
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
