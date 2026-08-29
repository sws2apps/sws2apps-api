import { env } from '../../config/env.js';
import { mailClient } from '../../platform/email/mail-client.js';

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

export const isWelcomeEmailEnabled = (): boolean => env.mailEnabled;

export const sendWelcomeEmail = (email: WelcomeEmail): void => {
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
			copyright: new Date().getFullYear(),
		},
	};

	void mailClient.sendEmail(options, 'Welcome message sent to user');
};
