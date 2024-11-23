import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
import { gmailConfig } from '../config/gmail-config.js';
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

export const sendEmail = async (options, successText) => {
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
	const passwordLessTemplate = `<p>Hello</p>\n<p>We received a request to sign in to Congregation Program for Everyone using this email address. If you want to sign in with your ${recipient} account, please use the link below:</p>\n<p><a href='${link}'>Sign in</a></p>\n<p>If you did not request this link, you can safely ignore this email.</p>\n<p>If you are having trouble opening the link above, please use the following link. Make sure the link is not cropped when you are opening it:</p>\n<p>${link}</p>`;

	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: 'Passwordless Link to Sign in to CPE app',
		template: 'passwordlessLinkSignIn',
		context: {
			passwordLessTemplate,
			emailFooter: '<p>Thank you\n<br>The Scheduling Workbox System Team</p>',
		},
	};

	sendEmail(options, 'Passwordless link sent to user');
};

export const sendWelcomeCPE = async (recipient, name, congregation, templateLang) => {
	const welcomeCPETemplate = `<p>Hello ${name},</p>\n<p>You recently created an sws2apps account to be used with the <strong>Congregation Program for Everyone (CPE)</strong> application. Your account is now ready to use with the following congregation: <strong>${congregation}.</strong></p>\n<p>To begin with, we are suggesting you to take a tour at our <a href='https://sws2apps.com/docs/category/congregation-program-for-everyone'>documentation website</a> to learn more about all the features of CPE application.</p>\n<p>It is good to have you on board, and we warmly welcome you. 🎉🎉🎉</p>`;

	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: 'Welcome to CPE',
		template: 'welcomeCPE',
		context: {
			welcomeCPETemplate,
			emailFooter: '<p>Thank you\n<br>The Scheduling Workbox System Team</p>',
		},
	};

	sendEmail(options, 'Welcome message sent to user');
};
