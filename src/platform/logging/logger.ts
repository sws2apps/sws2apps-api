import { Logtail } from '@logtail/node';
import type { Context, LogLevel } from '@logtail/types';

import { env } from '#config/env.js';
import {
	redactLogContext,
	stripLogControlCharacters,
} from './redaction.js';

const remoteLogger = env.logtailSourceToken
	? new Logtail(env.logtailSourceToken, { endpoint: `https://${env.logtailIngestingHost}` })
	: undefined;

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