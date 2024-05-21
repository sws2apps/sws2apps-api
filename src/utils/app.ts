import { CookieOptions } from 'express';

export const cookieOptions: CookieOptions = {
	httpOnly: true,
	signed: true,
	secure: true,
	sameSite: 'none',
	maxAge: 400 * 24 * 60 * 60 * 1000,
};
