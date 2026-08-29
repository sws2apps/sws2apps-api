import { env } from '../../config/env.js';
import { mailClient } from '../../platform/email/mail-client.js';

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

export const isPasswordlessEmailEnabled = (): boolean => env.mailEnabled;

export const sendPasswordlessLoginEmail = (
	email: PasswordlessLoginEmail,
): void => {
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
			copyright: new Date().getFullYear(),
		},
	};

	void mailClient.sendEmail(options, 'Passwordless link sent to user');
};
