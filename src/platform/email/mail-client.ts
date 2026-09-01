import path from 'node:path';
import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer/index.js';
import hbs, { NodemailerExpressHandlebarsOptions } from 'nodemailer-express-handlebars';
import { LogLevel } from '@logtail/types';

import { env } from '#config/env.js';
import { logger } from '#platform/logging/logger.js';
import { buildMailTransportOptions } from './mail-transport.js';

const sender = `${env.mailSenderName} <${env.mailAddress}>`;
const templatesPath = path.resolve('./src/platform/email/templates/');

const handlebarsOptions: NodemailerExpressHandlebarsOptions = {
	viewEngine: {
		partialsDir: templatesPath,
		defaultLayout: false,
	},
	viewPath: templatesPath,
};

const transportOptions = buildMailTransportOptions(env.mailAddress, env.mailPassword);

const transporter = nodemailer.createTransport(transportOptions, {
	from: sender,
	replyTo: 'support@organized-app.com',
});

transporter.use('compile', hbs(handlebarsOptions));

const sendOnce = (options: Mail.Options) => {
	return new Promise<boolean>((resolve) => {
		transporter.sendMail(options, (error) => resolve(!error));
	});
};

export const mailClient = {
	sendEmail: async (options: Mail.Options, successMessage: string) => {
		const maximumAttempts = 5;

		for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
			const wasSent = await sendOnce(options);

			if (wasSent) {
				logger(LogLevel.Info, successMessage, {
					service: 'mail_client',
					transport_status: 'success',
				});
				return true;
			}

			logger(LogLevel.Warn, `failed to send message; attempt ${attempt} of ${maximumAttempts}`, {
				service: 'mail_client',
				transport_status: 'failed',
			});
		}

		return false;
	},
};
