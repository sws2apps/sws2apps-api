import { Logtail } from '@logtail/node';

const sourceToken = process.env.LOGTAIL_SOURCE_TOKEN;

export const logger = (level: string, message: string) => {
	const logtail = sourceToken ? new Logtail(sourceToken) : undefined;

	if (level === 'info') {
		console.log(message);
		if (logtail) logtail.info(message);
	} else if (level === 'warn') {
		console.warn(message);
		if (logtail) logtail.warn(message);
	} else if (level === 'error') {
		console.error(message);
		if (logtail) logtail.error(message);
	}

	if (logtail) logtail.flush();
};
