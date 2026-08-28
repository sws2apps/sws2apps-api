import type { CookieOptions } from 'express';

const localDevelopmentHosts = new Set(['localhost', '127.0.0.1', '::1']);
const cookieLifetimeInMilliseconds = 400 * 24 * 60 * 60 * 1000;

export const buildSessionCookieOptions = (hostname: string, isProduction: boolean): CookieOptions => {
	const isLocalDevelopmentRequest = !isProduction && localDevelopmentHosts.has(hostname.toLowerCase());

	return {
		httpOnly: true,
		signed: true,
		secure: !isLocalDevelopmentRequest,
		sameSite: isLocalDevelopmentRequest ? 'lax' : 'none',
		maxAge: cookieLifetimeInMilliseconds,
	};
};
