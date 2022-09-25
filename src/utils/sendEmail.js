// dependencies
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';

// gmail config import
import { gmailConfig } from '../config/gmail-config.js';
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

export const sendVerificationEmail = async (
	recipient,
	fullname,
	activation
) => {
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
							JSON.stringify({
								details: `failed to send message: ${error.message}. trying again ...`,
							})
						);
						return resolve(false);
					}
					logger(
						'info',
						JSON.stringify({
							details: `confirmation message sent to ${options.to}`,
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
							JSON.stringify({
								details: `failed to send message: ${error.message}. trying again ...`,
							})
						);
						return resolve(false);
					}
					logger(
						'info',
						JSON.stringify({
							details: `confirmation message sent to ${options.to}`,
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

export const sendCongregationRequest = async (
	congregation_name,
	congregation_number,
	requestor_name
) => {
	const options = {
		from: gmailConfig.sender,
		to: process.env.GMAIL_ADDRESS,
		subject: 'Congregation Account Request (sws2apps)',
		template: 'congregationAccountRequest',
		context: {
			congregation_name: congregation_name,
			congregation_number: congregation_number,
			requestor_name: requestor_name,
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
							details: `admin echoed email for new congregation request`,
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
