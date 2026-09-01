import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parsePocketInvitationCode } from '#modules/pockets/invitation-code.js';

describe('Pocket invitation codes', () => {
	it('extracts congregation and temporary access details', () => {
		assert.deepEqual(parsePocketInvitationCode('MDGABC-user-invitation-key'), {
			countryCode: 'MDG',
			congregationPrefix: 'ABC',
			temporaryAccessCode: 'invitation-key',
		});
	});

	it('rejects missing segments and short congregation identities', () => {
		assert.equal(parsePocketInvitationCode('invalid-code'), undefined);
		assert.equal(parsePocketInvitationCode('MG-middle-key'), undefined);
	});
});
