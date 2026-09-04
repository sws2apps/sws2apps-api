import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	isPasswordlessEmailEnabled,
	sendPasswordlessLoginEmail,
} from '#modules/auth/index.js';

describe('passwordless email notifications', () => {
	it('reflects whether outbound email is enabled', () => {
		assert.equal(isPasswordlessEmailEnabled(true), true);
		assert.equal(isPasswordlessEmailEnabled(false), false);
	});

	it('sends login details only through the email template context', () => {
		let sendCount = 0;

		sendPasswordlessLoginEmail(
			{
				recipient: 'user@example.com',
				subject: 'Sign in',
				title: 'Your sign-in link',
				description: 'Use this secure link to continue.',
				loginLink: 'https://example.com/authenticate?token=secret-token',
				oneTimePassword: '123456',
				loginButtonLabel: 'Sign in',
				alternativeLinkText: 'Copy this link',
				ignoreRequestText: 'Ignore this message if you did not request it.',
				oneTimePasswordLabel: 'One-time password',
				oneTimePasswordDurationText: 'Valid for ten minutes',
			},
			{
				getCurrentYear: () => 2026,
				sendEmail: async (options, successMessage) => {
					sendCount += 1;
					assert.deepEqual(options, {
						to: 'user@example.com',
						subject: 'Sign in',
						template: 'login',
						context: {
							loginTitle: 'Your sign-in link',
							loginDesc: 'Use this secure link to continue.',
							link: 'https://example.com/authenticate?token=secret-token',
							otp: '123456',
							loginButton: 'Sign in',
							loginAltText: 'Copy this link',
							loginIgnoreText:
								'Ignore this message if you did not request it.',
							loginOTP: 'One-time password',
							loginOTPDuration: 'Valid for ten minutes',
							copyright: 2026,
						},
					});
					assert.equal(successMessage, 'Passwordless link sent to user');
					assert.equal(successMessage.includes('123456'), false);
					assert.equal(successMessage.includes('secret-token'), false);
					return true;
				},
			},
		);

		assert.equal(sendCount, 1);
	});
});
