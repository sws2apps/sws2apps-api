import type { Context } from '@logtail/types';

const redactedValue = '[REDACTED]';
const sensitiveKeyPatterns = [
	/authorization|cookie|email|password|secret|token|backup|browser/i,
	/access.?code|master.?key|user.?id|congregation.?id|cong_?id|^ip$/i,
];

const redactValue = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(redactValue);
	if (!value || typeof value !== 'object') return value;

	return Object.fromEntries(
		Object.entries(value).map(([key, nestedValue]) => {
			if (sensitiveKeyPatterns.some((pattern) => pattern.test(key))) return [key, redactedValue];
			return [key, redactValue(nestedValue)];
		}),
	);
};

/**
 * Recursively removes known credential and personal-data fields from logging
 * context. This is a final safety boundary, not permission to log raw request
 * bodies or arbitrary objects upstream.
 */
export const redactLogContext = (context: Context | undefined) => {
	if (!context) return;
	return redactValue(context) as Context;
};
