import { env } from '#config/env.js';
import { mailClient } from '#platform/email/mail-client.js';

type PasswordlessLoginEmail = {
	recipient: string;
	subject: string;
	title: string;
	description: string;
	loginLink: string;
	oneTimePassword: string | undefined;
	loginButtonLabel: string;
	alternativeLinkText: string;
	ignoreRequestText: string;
	oneTimePasswordLabel: string;
	oneTimePasswordDurationText: string;
};

export type PasswordlessEmailOperations = {
	sendEmail: typeof mailClient.sendEmail;
	getCurrentYear: () => number;
};

const defaultPasswordlessEmailOperations: PasswordlessEmailOperations = {
	sendEmail: (options, successMessage) => {
		return mailClient.sendEmail(options, successMessage);
	},
	getCurrentYear: () => new Date().getFullYear(),
};

export const isPasswordlessEmailEnabled = (
	mailEnabled = env.mailEnabled,
): boolean => mailEnabled;

export const sendPasswordlessLoginEmail = (
	email: PasswordlessLoginEmail,
	operations: Partial<PasswordlessEmailOperations> = {},
): void => {
	const notification = {
		...defaultPasswordlessEmailOperations,
		...operations,
	};
	const options = {
		to: email.recipient,
		subject: email.subject,
		template: 'login',
		context: {
			loginTitle: email.title,
			loginDesc: email.description,
			link: email.loginLink,
			otp: email.oneTimePassword,
			loginButton: email.loginButtonLabel,
			loginAltText: email.alternativeLinkText,
			loginIgnoreText: email.ignoreRequestText,
			loginOTP: email.oneTimePasswordLabel,
			loginOTPDuration: email.oneTimePasswordDurationText,
			copyright: notification.getCurrentYear(),
		},
	};

	void notification.sendEmail(options, 'Passwordless link sent to user');
};
