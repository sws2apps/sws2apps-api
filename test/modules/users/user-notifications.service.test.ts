import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sendFeedbackEmail } from '#modules/users/index.js';

describe('user feedback notifications', () => {
	it('routes feedback to support with the requester as reply-to', () => {
		let sendCount = 0;

		sendFeedbackEmail(
			{
				replyTo: 'user@example.com',
				subject: 'Schedule feedback',
				message: 'The schedule view is helpful.',
			},
			{
				sendEmail: async (options, successMessage) => {
					sendCount += 1;
					assert.deepEqual(options, {
						to: 'support@organized-app.com',
						replyTo: 'user@example.com',
						subject: 'Feedback: Schedule feedback',
						template: 'feedback',
						context: {
							message: 'The schedule view is helpful.',
						},
					});
					assert.equal(
						successMessage,
						'Feedback sent successfully to support team',
					);
					assert.equal(successMessage.includes('schedule view'), false);
					return true;
				},
			},
		);

		assert.equal(sendCount, 1);
	});
});
