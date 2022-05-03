// dependencies
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';

// gmail config import
import { gmailConfig } from '../config/gmail-config.js';
import { logger } from './logger.js';

const handlebarsOptions = {
	viewEngine: {
		partialsDir: path.resolve('./views/'),
		defaultLayout: false,
	},
	viewPath: path.resolve('./views/'),
};

const transporter = nodemailer.createTransport(gmailConfig.transport);
transporter.use('compile', hbs(handlebarsOptions));

export const sendVerificationEmail = async (recipient, activation) => {
	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: 'Please verify your account (sws2apps)',
		template: 'verifyAccount',
		context: {
			name: recipient,
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
							`failed to send message: ${error.message}. trying again ...`
						);
						return resolve(false);
					}
					logger('info', `verification message sent to ${options.to}`);
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

export const sendCongregationAccountCreated = async (
	recipient,
	fullname,
	congregation_name,
	congregation_number
) => {
	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: 'Congregation Account created successfully (sws2apps)',
		template: 'congregationAccountCreated',
		context: {
			name: fullname,
			congregation_name: congregation_name,
			congregation_number: congregation_number,
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
							`failed to send message: ${error.message}. trying again ...`
						);
						return resolve(false);
					}
					logger('info', `confirmation message sent to ${options.to}`);
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

export const sendCongregationAccountDisapproved = async (
	recipient,
	fullname,
	congregation_name,
	congregation_number,
	disapproval_reason
) => {
	const options = {
		from: gmailConfig.sender,
		to: recipient,
		subject: 'Congregation Account Request Disapproved (sws2apps)',
		template: 'congregationAccountDisapproved',
		context: {
			name: fullname,
			congregation_name: congregation_name,
			congregation_number: congregation_number,
			disapproval_reason: disapproval_reason,
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
							`failed to send message: ${error.message}. trying again ...`
						);
						return resolve(false);
					}
					logger('info', `confirmation message sent to ${options.to}`);
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

export const sendUserResetPassword = async (
	recipient,
	fullname,
	resetPasswordLink
) => {
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
							`failed to send message: ${error.message}. trying again ...`
						);
						return resolve(false);
					}
					logger('info', `reset password link message sent to ${options.to}`);
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
