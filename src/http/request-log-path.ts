import type { Request } from 'express';

export const getRequestLogPath = (request: Request): string => {
	const routePath = request.route?.path;

	return typeof routePath === 'string' ? routePath : 'unmatched';
};
