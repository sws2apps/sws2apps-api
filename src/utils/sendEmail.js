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

export const sendVerificationEmail = async (recipient, fullname, activation) => {
	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: 'Please verify your account (sws2apps)',
		template: 'verifyAccount',
		context: {
			name: fullname,
			activation: activation,
		},
	};

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
							details: `verification message sent to ${options.to}`,
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

export const sendUserResetPassword = async (recipient, fullname, resetPasswordLink) => {
	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: 'Reset Your Password (sws2apps)',
		template: 'userResetPassword',
		context: {
			name: fullname,
			reset_password_link: resetPasswordLink,
		},
	};

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
							details: `reset password link message sent to ${options.to}`,
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
