import path from 'path';
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer/index.js';
import SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import hbs, { NodemailerExpressHandlebarsOptions } from 'nodemailer-express-handlebars';
import { logger } from '../services/logger/logger.js';

const MAIL_ADDRESS = process.env.MAIL_ADDRESS!;
const MAIL_SENDER_NAME = process.env.MAIL_SENDER_NAME! + ' <' + MAIL_ADDRESS + '>';
const MAIL_PASSWORD = process.env.MAIL_PASSWORD!;

const handlebarsOptions: NodemailerExpressHandlebarsOptions = {
	viewEngine: {
		partialsDir: path.resolve('./src/v3/views/'),
		defaultLayout: false,
	},
	viewPath: path.resolve('./src/v3/views/'),
};

const transportOptions: SMTPTransport.Options = {
	service: 'gmail',
	secure: true,
	tls: { rejectUnauthorized: false },
	auth: {
		user: MAIL_ADDRESS,
		pass: MAIL_PASSWORD,
	},
};

const transporter = nodemailer.createTransport(transportOptions, {
	from: MAIL_SENDER_NAME,
	replyTo: 'support@organized-app.com',
});

transporter.use('compile', hbs(handlebarsOptions));

export const MailClient = {
	sendEmail: async (options: Mail.Options, successText: string) => {
		const intTry = 5;
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
	},
};
