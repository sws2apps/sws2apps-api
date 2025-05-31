import { Logtail } from '@logtail/node';
import { Context, LogLevel } from '@logtail/types';

const sourceToken = process.env.LOGTAIL_SOURCE_TOKEN;
const ingestingHost = process.env.LOGTAIL_INGESTING_HOST ?? 'in.logs.betterstack.com';

export const logger = (level: LogLevel, message: string, context?: Context) => {
	const logtail = sourceToken ? new Logtail(sourceToken, { endpoint: `https://${ingestingHost}` }) : undefined;

	const date = new Date();

	let localMessage = date.toJSON().split('T')[0] + 'T' + date.toTimeString().split(' ')[0] + ' ' + message;

	if (context) {
		localMessage +=
			', ' +
			Object.entries(context)
				.filter(([, value]) => value !== undefined)
				.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
				.join(' ');
	}

	if (level === 'info') {
		console.log(localMessage);
		if (logtail) logtail.info(message, context);
	} else if (level === 'warn') {
		console.warn(localMessage);
		if (logtail) logtail.warn(message, context);
	} else if (level === 'error') {
		console.error(localMessage);
		if (logtail) logtail.error(message, context);
	}

	if (logtail) logtail.flush();
};
