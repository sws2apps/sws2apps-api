import type { Context } from '@logtail/types';

const redactedValue = '[REDACTED]';
const sensitiveKeyPattern = /(authorization|cookie|email|password|secret|token|access.?code|master.?key|backup)/i;

const redactValue = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(redactValue);
	if (!value || typeof value !== 'object') return value;

	return Object.fromEntries(
		Object.entries(value).map(([key, nestedValue]) => {
			if (sensitiveKeyPattern.test(key)) return [key, redactedValue];
			return [key, redactValue(nestedValue)];
		}),
	);
};

export const redactLogContext = (context: Context | undefined) => {
	if (!context) return;
	return redactValue(context) as Context;
};
