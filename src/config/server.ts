export const serverConfig = {
	rateLimit: {
		windowMilliseconds: 1_000,
		maximumRequestsPerWindow: 20,
	},
	requestBodySizeLimit: '10mb',
} as const;
