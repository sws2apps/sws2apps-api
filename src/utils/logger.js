import { Logtail } from '@logtail/node';

export const logger = (level, message) => {
  const isProd = process.env.NODE_ENV === 'production';

  const logtail = isProd ? new Logtail(process.env.LOGTAIL_SOURCE_TOKEN) : undefined;

  if (level === 'info') {
    console.log(message);
    if (isProd) logtail.info(message);
  } else if (level === 'warn') {
    console.warn(message);
    if (isProd) logtail.warn(message);
  } else if (level === 'error') {
    console.error(message);
    if (isProd) logtail.error(message);
  }
};
