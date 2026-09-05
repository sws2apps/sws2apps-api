import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	isJoinRequestApprovalEmailEnabled,
	sendJoinRequestApprovalEmail,
} from '#modules/congregation-administration/index.js';

describe('join request approval notifications', () => {
	it('reflects whether outbound email is enabled', () => {
		assert.equal(isJoinRequestApprovalEmailEnabled(true), true);
		assert.equal(isJoinRequestApprovalEmailEnabled(false), false);
	});

	it('maps translated approval content into the email template', () => {
		let sendCount = 0;

		sendJoinRequestApprovalEmail(
			{
				recipient: 'user@example.com',
				subject: 'Request approved',
				greeting: 'Hello Ada',
				title: 'Your request was approved',
				message: 'You can now access the congregation.',
			},
			{
				getCurrentYear: () => 2026,
				sendEmail: async (options, successMessage) => {
					sendCount += 1;
					assert.deepEqual(options, {
						to: 'user@example.com',
						subject: 'Request approved',
						template: 'join-request-approved',
						context: {
							requestor: 'Hello Ada',
							joinRequestApprovedTitle: 'Your request was approved',
							joinRequestApprovedMessage:
								'You can now access the congregation.',
							copyright: 2026,
						},
					});
					assert.equal(
						successMessage,
						'Join request approval email sent to user',
					);
					assert.equal(successMessage.includes('Ada'), false);
					return true;
				},
			},
		);

		assert.equal(sendCount, 1);
	});
});
