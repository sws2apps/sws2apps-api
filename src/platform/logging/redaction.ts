import type { Context } from '@logtail/types';

const redactedValue = '[REDACTED]';
const sensitiveKeyPatterns = [
	/authorization|cookie|email|password|secret|token|backup|browser/i,
	/access.?code|master.?key|user.?id|congregation.?id|cong_?id|^ip$/i,
];

// Strip all C0 control characters and DEL, including CR, LF, and the ANSI
// escape byte, from untrusted content before it reaches any log sink: a
// crafted newline could forge a separate log entry and an escape sequence
// could spoof operator output (CWE-117). Applied to every context string as
// part of the redaction pass so local serialization and remote payloads share
// the same sanitized values.
export const stripLogControlCharacters = (value: string): string => {
	let safeText = '';
	for (const character of value) {
		const codePoint = character.codePointAt(0)!;
		safeText += codePoint < 0x20 || codePoint === 0x7f ? ' ' : character;
	}
	return safeText;
};

const redactValue = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(redactValue);
	if (typeof value === 'string') return stripLogControlCharacters(value);
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
