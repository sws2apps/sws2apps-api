// dependency import
import { Logtail } from '@logtail/node';

export const logger = (level, message) => {
	const isProd = process.env.NODE_ENV === 'production'

	const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);

	let msg = message.replace(/\n|\r/g, '');

	if (level === 'info') {
		console.log(msg);
		if (isProd) logtail.info(msg)
	} else if (level === 'warn') {
		console.warn(msg);
		if (isProd) logtail.warn(msg)
	} else if (level === 'error') {
		console.error(msg);
		if (isProd) logtail.error(msg)
	}
};
