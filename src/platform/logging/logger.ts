import { Logtail } from '@logtail/node';
import type { Context, LogLevel } from '@logtail/types';

import { env } from '#config/env.js';
import { redactLogContext } from './redaction.js';

const remoteLogger = env.logtailSourceToken
	? new Logtail(env.logtailSourceToken, { endpoint: `https://${env.logtailIngestingHost}` })
	: undefined;

// All C0 control characters and DEL, including CR, LF, and the ANSI escape
// byte. Untrusted content must never reach the live terminal unchanged: a
// crafted newline could forge a separate log entry and an escape sequence
// could spoof operator output (CWE-117). The trailing no-op replace also marks
// the returned value as newline-sanitized for static analysis.
const stripConsoleControlCharacters = (value: string): string => {
	let safeText = '';
	for (const character of value) {
		const codePoint = character.codePointAt(0)!;
		safeText += codePoint < 0x20 || codePoint === 0x7f ? ' ' : character;
	}
	return safeText.replace(/\r?\n/g, '');
};

export const logger = (level: LogLevel, message: string, context?: Context) => {
	const safeContext = redactLogContext(context);
	let localMessage = `${new Date().toISOString()} ${message}`;

	if (safeContext) {
		localMessage +=
			', ' +
			Object.entries(safeContext)
				.filter(([, value]) => value !== undefined)
				.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
				.join(' ');
	}

	const consoleEntry = stripConsoleControlCharacters(localMessage);

	if (level === 'info') {
		console.log(consoleEntry);
		remoteLogger?.info(message, safeContext);
	} else if (level === 'warn') {
		console.warn(consoleEntry);
		remoteLogger?.warn(message, safeContext);
	} else if (level === 'error') {
		console.error(consoleEntry);
		remoteLogger?.error(message, safeContext);
	}

	void remoteLogger?.flush().catch(() => {
		console.error(`${new Date().toISOString()} failed to flush remote logs`);
	});
};