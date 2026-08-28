import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

export const buildMailTransportOptions = (emailAddress: string | undefined, password: string | undefined) => {
	const transportOptions: SMTPTransport.Options = {
		service: 'gmail',
		secure: true,
		auth: {
			user: emailAddress,
			pass: password,
		},
	};

	return transportOptions;
};
