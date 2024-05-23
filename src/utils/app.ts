import { CookieOptions, Request } from 'express';

const isLocalRequest = (req: Request) => {
	const host = req.get('host');
	return host?.includes('localhost');
};

export const cookieOptions = (req: Request): CookieOptions => {
	const isLocalHost = isLocalRequest(req);

	return {
		httpOnly: true,
		signed: true,
		secure: isLocalHost ? !isLocalHost : true,
		sameSite: isLocalHost ? 'lax' : 'none',
		maxAge: 400 * 24 * 60 * 60 * 1000,
	};
};
