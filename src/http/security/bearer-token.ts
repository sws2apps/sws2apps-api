const bearerTokenPattern = /^Bearer ([^\s]+)$/;

export const extractBearerToken = (authorizationHeader: string) => {
	const match = bearerTokenPattern.exec(authorizationHeader);
	return match?.[1];
};
