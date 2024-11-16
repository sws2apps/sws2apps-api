import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import { gmailConfig } from '../config/gmail-config.js';
import { i18n } from '../config/i18n-config.js';
import { logger } from './logger.js';

const handlebarsOptions = {
	viewEngine: {
		partialsDir: path.resolve('./src/v2/views/'),
		defaultLayout: false,
	},
	viewPath: path.resolve('./src/v2/views/'),
};

const transporter = nodemailer.createTransport(gmailConfig.transport);
transporter.use('compile', hbs(handlebarsOptions));

const sendEmail = async (options, successText) => {
	const intTry = 10;
	let i = 0;
	let retry = false;

	do {
		const send = async () => {
			return new Promise((resolve) => {
				return transporter.sendMail(options, (error, info) => {
					if (error) {
						logger(
							'warn',
							JSON.stringify({
								details: `failed to send message: ${error.message}. trying again ...`,
							})
						);
						return resolve(false);
					}
					logger(
						'info',
						JSON.stringify({
							details: successText,
						})
					);
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

export const sendPasswordlessLinkSignIn = async (recipient, link, templateLang) => {
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

export const sendWelcomeCPE = async (recipient, name, congregation, templateLang) => {
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
