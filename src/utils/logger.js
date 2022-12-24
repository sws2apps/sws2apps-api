import { Logtail } from '@logtail/node';

export const logger = (level, message) => {
	if (global.isProd || global.isDev) {
		const logtail = global.isProd ? new Logtail(process.env.LOGTAIL_SOURCE_TOKEN) : undefined;

		if (level === 'info') {
			console.log(message);
			if (global.isProd) logtail.info(message);
		} else if (level === 'warn') {
			console.warn(message);
			if (global.isProd) logtail.warn(message);
		} else if (level === 'error') {
			console.error(message);
			if (global.isProd) logtail.error(message);
		}
	}
};
