import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import { gmailConfig } from '../config/gmail-config.js';
import { i18n } from '../config/i18n-config.js';
import { logger } from './logger.js';

const handlebarsOptions = {
	viewEngine: {
		partialsDir: path.resolve('./src/views/'),
		defaultLayout: false,
	},
	viewPath: path.resolve('./src/views/'),
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

export const sendPasswordlessLinkSignUp = async (recipient, link, templateLang) => {
	const t = i18n(templateLang.toLowerCase());

	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: t('emailPasswordlessSubject'),
		template: 'passwordlessLinkSignIn',
		context: {
			greetings: t('greetingsNoName'),
			passwordLessIntro: t('passwordLessIntro', { email: recipient }),
			passwordLessIgnore: t('passwordLessIgnore'),
			signIn: t('signIn'),
			passwordLessLinkFull: t('passwordLessLinkFull'),
			link: link,
			thankYou: t('thankYou'),
			sws2appsTeam: t('sws2appsTeam'),
		},
	};

	sendEmail(options, 'Passwordless link sent to user');
};
