import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	isWelcomeEmailEnabled,
	sendWelcomeEmail,
} from '#modules/congregations/index.js';

describe('congregation welcome notifications', () => {
	it('reflects whether outbound email is enabled', () => {
		assert.equal(isWelcomeEmailEnabled(true), true);
		assert.equal(isWelcomeEmailEnabled(false), false);
	});

	it('maps translated content into the welcome template', () => {
		let sendCount = 0;

		sendWelcomeEmail(
			{
				recipient: 'user@example.com',
				subject: 'Welcome',
				welcomeTitle: 'Welcome to Organized',
				welcomeDescription: 'Your congregation is ready.',
				watchVideoLabel: 'Watch video',
				moreInformationTitle: 'More information',
				guideLabel: 'Read the guide',
				blogLabel: 'Visit the blog',
				supportLabel: 'Contact support',
			},
			{
				getCurrentYear: () => 2026,
				sendEmail: async (options, successMessage) => {
					sendCount += 1;
					assert.deepEqual(options, {
						to: 'user@example.com',
						subject: 'Welcome',
						template: 'welcome',
						context: {
							welcomeTitle: 'Welcome to Organized',
							welcomeDesc: 'Your congregation is ready.',
							watchVideoLabel: 'Watch video',
							moreInfoTitle: 'More information',
							moreInfoGuideLabel: 'Read the guide',
							moreInfoBlogLabel: 'Visit the blog',
							moreInfoSupportLabel: 'Contact support',
							copyright: 2026,
						},
					});
					assert.equal(successMessage, 'Welcome message sent to user');
					return true;
				},
			},
		);

		assert.equal(sendCount, 1);
	});
});
