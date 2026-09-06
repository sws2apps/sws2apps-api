import { Logtail } from '@logtail/node';
import type { Context, LogLevel } from '@logtail/types';

import { env } from '#config/env.js';
import { redactLogContext } from './redaction.js';

const remoteLogger = env.logtailSourceToken
	? new Logtail(env.logtailSourceToken, { endpoint: `https://${env.logtailIngestingHost}` })
	: undefined;

// Strip all C0 control characters and DEL, including CR, LF, and the ANSI
// escape byte, from untrusted content before it reaches a log sink: a crafted
// newline could forge a separate log entry and an escape sequence could spoof
// operator output (CWE-117). Sinks additionally receive the JSON-encoded
// entry, which escapes any residual CR/LF to literal `\n`, so the entry can
// never be split into live lines.
const stripLogControlCharacters = (value: string): string => {
	let safeText = '';
	for (const character of value) {
		const codePoint = character.codePointAt(0)!;
		safeText += codePoint < 0x20 || codePoint === 0x7f ? ' ' : character;
	}
	return safeText;
};

export const logger = (level: LogLevel, message: string, context?: Context) => {
	const safeContext = redactLogContext(context);
	const sanitizedMessage = stripLogControlCharacters(message);
	let localMessage = `${new Date().toISOString()} ${sanitizedMessage}`;

	if (safeContext) {
		localMessage +=
			', ' +
			Object.entries(safeContext)
				.filter(([, value]) => value !== undefined)
				.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
				.join(' ');
	}

	const logEntry = JSON.stringify(localMessage);

	if (level === 'info') {
		console.log(logEntry);
		remoteLogger?.info(logEntry, safeContext);
	} else if (level === 'warn') {
		console.warn(logEntry);
		remoteLogger?.warn(logEntry, safeContext);
	} else if (level === 'error') {
		console.error(logEntry);
		remoteLogger?.error(logEntry, safeContext);
	}

	void remoteLogger?.flush().catch(() => {
		console.error(`${new Date().toISOString()} failed to flush remote logs`);
	});
};