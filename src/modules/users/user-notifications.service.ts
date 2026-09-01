import { mailClient } from '#platform/email/mail-client.js';

type FeedbackEmail = {
	replyTo: string | undefined;
	subject: string;
	message: string;
};

export const sendFeedbackEmail = (email: FeedbackEmail): void => {
	const options = {
		to: 'support@organized-app.com',
		replyTo: email.replyTo,
		subject: `Feedback: ${email.subject}`,
		template: 'feedback',
		context: {
			message: email.message,
		},
	};

	void mailClient.sendEmail(
		options,
		'Feedback sent successfully to support team',
	);
};
