const GMAIL_ADDRESS = process.env.GMAIL_ADDRESS;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const GMAIL_SENDER_NAME = process.env.GMAIL_SENDER_NAME;
const GMAIL_FULL_SENDER_NAME = GMAIL_SENDER_NAME + ' <' + GMAIL_ADDRESS + '>';

export const gmailConfig = {
	transport: {
		service: 'gmail',
		auth: {
			user: GMAIL_ADDRESS,
			pass: GMAIL_APP_PASSWORD,
		},
		secure: true,
		tls: {
			rejectUnauthorized: false,
		},
	},
	sender: GMAIL_FULL_SENDER_NAME,
	senderName: GMAIL_SENDER_NAME,
};
