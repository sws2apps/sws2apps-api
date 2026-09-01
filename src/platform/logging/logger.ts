import { Logtail } from '@logtail/node';
import type { Context, LogLevel } from '@logtail/types';

import { env } from '#config/env.js';
import { redactLogContext } from './redaction.js';

const remoteLogger = env.logtailSourceToken
	? new Logtail(env.logtailSourceToken, { endpoint: `https://${env.logtailIngestingHost}` })
	: undefined;

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

	if (level === 'info') {
		console.log(localMessage);
		remoteLogger?.info(message, safeContext);
	} else if (level === 'warn') {
		console.warn(localMessage);
		remoteLogger?.warn(message, safeContext);
	} else if (level === 'error') {
		console.error(localMessage);
		remoteLogger?.error(message, safeContext);
	}

	void remoteLogger?.flush().catch(() => {
		console.error(`${new Date().toISOString()} failed to flush remote logs`);
	});
};
