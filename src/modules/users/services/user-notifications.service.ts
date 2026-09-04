import { mailClient } from '#platform/email/mail-client.js';

type FeedbackEmail = {
	replyTo: string | undefined;
	subject: string;
	message: string;
};

export type FeedbackEmailOperations = {
	sendEmail: typeof mailClient.sendEmail;
};

const defaultFeedbackEmailOperations: FeedbackEmailOperations = {
	sendEmail: (options, successMessage) => {
		return mailClient.sendEmail(options, successMessage);
	},
};

export const sendFeedbackEmail = (
	email: FeedbackEmail,
	operations: Partial<FeedbackEmailOperations> = {},
): void => {
	const notification = {
		...defaultFeedbackEmailOperations,
		...operations,
	};
	const options = {
		to: 'support@organized-app.com',
		replyTo: email.replyTo,
		subject: `Feedback: ${email.subject}`,
		template: 'feedback',
		context: {
			message: email.message,
		},
	};

	void notification.sendEmail(
		options,
		'Feedback sent successfully to support team',
	);
};
