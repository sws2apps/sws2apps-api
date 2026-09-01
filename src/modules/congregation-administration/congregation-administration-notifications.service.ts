import { env } from '#config/env.js';
import { mailClient } from '#platform/email/mail-client.js';

type JoinRequestApprovalEmail = {
	recipient: string;
	subject: string;
	greeting: string;
	title: string;
	message: string;
};

export const isJoinRequestApprovalEmailEnabled = (): boolean => env.mailEnabled;

export const sendJoinRequestApprovalEmail = (
	email: JoinRequestApprovalEmail,
): void => {
	const options = {
		to: email.recipient,
		subject: email.subject,
		template: 'join-request-approved',
		context: {
			requestor: email.greeting,
			joinRequestApprovedTitle: email.title,
			joinRequestApprovedMessage: email.message,
			copyright: new Date().getFullYear(),
		},
	};

	void mailClient.sendEmail(
		options,
		'Join request approval email sent to user',
	);
};
