import type { CorsOptions } from 'cors';
import type { Request } from 'express';

const trustedApplicationOrigins = new Set([
	'https://organized-app.com',
	'https://staging.organized-app.com',
	'https://cpe-web.sws2apps.com',
	'https://console.sws2apps.com',
	'https://dev-console.sws2apps.com',
	'https://cpe-sws.firebaseapp.com',
]);

const crossOriginPublicPaths = new Set(['/app-version', '/api/public/source-material']);

const normalizePath = (requestUri: string | undefined) => {
	if (!requestUri) return '';
	return requestUri.split(/[?#]/, 1)[0];
};

export const isTrustedApplicationOrigin = (origin: string | undefined): boolean => {
	return Boolean(origin && trustedApplicationOrigins.has(origin));
};

export const isProductionCorsRequestAllowed = (origin: string | undefined, requestPath: string | undefined) => {
	if (!origin) return false;
	if (isTrustedApplicationOrigin(origin)) return true;

	return crossOriginPublicPaths.has(normalizePath(requestPath));
};

export const isPasswordlessOriginAllowed = (origin: string, isProduction: boolean): boolean => {
	if (isTrustedApplicationOrigin(origin)) return true;
	if (isProduction) return false;

	try {
		const url = new URL(origin);
		const isHttpProtocol = url.protocol === 'http:' || url.protocol === 'https:';
		const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

		return isHttpProtocol && isLocalHost;
	} catch {
		return false;
	}
};

export const createCorsOptions = (request: Request, isProduction: boolean): CorsOptions => {
	const originalRequestUri = request.header('x-original-uri') || request.originalUrl;
	const origin = request.header('Origin');

	return {
		origin: isProduction ? isProductionCorsRequestAllowed(origin, originalRequestUri) : true,
		credentials: true,
		methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		maxAge: 86400,
	};
};
