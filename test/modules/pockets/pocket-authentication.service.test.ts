import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	authenticatePocketInvitation,
	PocketAuthenticationError,
} from '../../../src/modules/pockets/pocket-authentication.service.js';

describe('Pocket authentication service', () => {
	it('rejects a malformed invitation before creating a session', async () => {
		await assert.rejects(
			authenticatePocketInvitation({
				invitationCode: 'invalid-code',
				visitorIp: '127.0.0.1',
				headers: {},
			}),
			(error: unknown) =>
				error instanceof PocketAuthenticationError && error.code === 'INVALID_INVITATION',
		);
	});
});
