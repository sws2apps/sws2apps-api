const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

const gmailConfig = require('../config/gmail-config');

const handlebarsOptions = {
	viewEngine: {
		partialsDir: path.resolve('./views/'),
		defaultLayout: false,
	},
	viewPath: path.resolve('./views/'),
};

const transporter = nodemailer.createTransport(gmailConfig.transport);
transporter.use('compile', hbs(handlebarsOptions));

const sendVerificationEmail = async (recipient, activation) => {
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
			return new Promise((resolve, reject) => {
				return transporter.sendMail(options, (error, info) => {
					if (error) {
						console.log('failed to send message: ', error.message);
						console.log('Trying again ...');
						return resolve(false);
					}
					console.log('message sent to ', options.to, info);
					return resolve(true);
				});
			});
		};

		const runSend = await send();
		retry = !runSend;
		i++;
	} while (i < intTry && retry);
};

module.exports = {
	sendVerificationEmail,
};
