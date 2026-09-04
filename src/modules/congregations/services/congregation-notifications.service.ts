import { env } from '#config/env.js';
import { mailClient } from '#platform/email/mail-client.js';

type WelcomeEmail = {
	recipient: string;
	subject: string;
	welcomeTitle: string;
	welcomeDescription: string;
	watchVideoLabel: string;
	moreInformationTitle: string;
	guideLabel: string;
	blogLabel: string;
	supportLabel: string;
};

export type WelcomeEmailOperations = {
	sendEmail: typeof mailClient.sendEmail;
	getCurrentYear: () => number;
};

const defaultWelcomeEmailOperations: WelcomeEmailOperations = {
	sendEmail: (options, successMessage) => {
		return mailClient.sendEmail(options, successMessage);
	},
	getCurrentYear: () => new Date().getFullYear(),
};

export const isWelcomeEmailEnabled = (
	mailEnabled = env.mailEnabled,
): boolean => mailEnabled;

export const sendWelcomeEmail = (
	email: WelcomeEmail,
	operations: Partial<WelcomeEmailOperations> = {},
): void => {
	const notification = {
		...defaultWelcomeEmailOperations,
		...operations,
	};
	const options = {
		to: email.recipient,
		subject: email.subject,
		template: 'welcome',
		context: {
			welcomeTitle: email.welcomeTitle,
			welcomeDesc: email.welcomeDescription,
			watchVideoLabel: email.watchVideoLabel,
			moreInfoTitle: email.moreInformationTitle,
			moreInfoGuideLabel: email.guideLabel,
			moreInfoBlogLabel: email.blogLabel,
			moreInfoSupportLabel: email.supportLabel,
			copyright: notification.getCurrentYear(),
		},
	};

	void notification.sendEmail(options, 'Welcome message sent to user');
};
