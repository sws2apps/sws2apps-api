import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer/index.js';
import hbs, { NodemailerExpressHandlebarsOptions } from 'nodemailer-express-handlebars';
import path from 'path';
import { gmailConfig } from '../../config/gmail_config.js';
import { i18n } from '../../config/i18n_config.js';
import { logger } from '../logger/logger.js';

const handlebarsOptions: NodemailerExpressHandlebarsOptions = {
	viewEngine: {
		partialsDir: path.resolve('./src/views/'),
		defaultLayout: false,
	},
	viewPath: path.resolve('./src/views/'),
};

const transporter = nodemailer.createTransport(gmailConfig.transport);

transporter.use('compile', hbs(handlebarsOptions));

const sendEmail = async (options: Mail.Options, successText: string) => {
	const intTry = 10;
	let i = 0;
	let retry = false;

	do {
		const send = async () => {
			return new Promise((resolve) => {
				return transporter.sendMail(options, (error) => {
					if (error) {
						logger(
							'warn',
							JSON.stringify({
								details: `failed to send message: ${error.message}. trying again ...`,
							})
						);
						return resolve(false);
					}

					logger('info', JSON.stringify({ details: successText }));
					return resolve(true);
				});
			});
		};

		const runSend = await send();
		retry = !runSend;
		i++;
	} while (i < intTry && retry);

	return !retry;
};

export const sendPasswordlessLinkSignIn = async (recipient: string, link: string, templateLang: string) => {
	const t = i18n(templateLang.toLowerCase());

	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: t('passwordLessSubject'),
		template: 'passwordlessLinkSignIn',
		context: {
			passwordLessTemplate: t('passwordLessTemplate', { email: recipient, linkPasswordLess: link }),
			emailFooter: t('emailFooter'),
		},
	};

	sendEmail(options, 'Passwordless link sent to user');
};

export const sendWelcomeMessage = async (recipient: string, name: string, congregation: string, templateLang: string) => {
	const t = i18n(templateLang.toLowerCase());

	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: t('welcomeCPESubject'),
		template: 'welcomeCPE',
		context: {
			welcomeCPETemplate: t('welcomeCPETemplate', { name, congregation }),
			emailFooter: t('emailFooter'),
		},
	};

	sendEmail(options, 'Welcome message sent to user');
};
