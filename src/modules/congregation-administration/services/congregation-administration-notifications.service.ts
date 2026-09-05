import { env } from '#config/env.js';
import { mailClient } from '#platform/email/mail-client.js';

type JoinRequestApprovalEmail = {
	recipient: string;
	subject: string;
	greeting: string;
	title: string;
	message: string;
};

export type JoinRequestApprovalEmailOperations = {
	sendEmail: typeof mailClient.sendEmail;
	getCurrentYear: () => number;
};

const defaultEmailOperations: JoinRequestApprovalEmailOperations = {
	sendEmail: (options, successMessage) => {
		return mailClient.sendEmail(options, successMessage);
	},
	getCurrentYear: () => new Date().getFullYear(),
};

export const isJoinRequestApprovalEmailEnabled = (
	mailEnabled = env.mailEnabled,
): boolean => mailEnabled;

export const sendJoinRequestApprovalEmail = (
	email: JoinRequestApprovalEmail,
	operations: Partial<JoinRequestApprovalEmailOperations> = {},
): void => {
	const notification = {
		...defaultEmailOperations,
		...operations,
	};
	const options = {
		to: email.recipient,
		subject: email.subject,
		template: 'join-request-approved',
		context: {
			requestor: email.greeting,
			joinRequestApprovedTitle: email.title,
			joinRequestApprovedMessage: email.message,
			copyright: notification.getCurrentYear(),
		},
	};

	void notification.sendEmail(
		options,
		'Join request approval email sent to user',
	);
};
