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

	it('preserves hyphens within non-empty invitation segments', () => {
		for (const invitationCode of ['MDGABC--user-key', 'MDGABC---key']) {
			assert.deepEqual(parsePocketInvitationCode(invitationCode), {
				countryCode: 'MDG',
				congregationPrefix: 'ABC',
				temporaryAccessCode: 'key',
			});
		}
		assert.equal(parsePocketInvitationCode('MDGABC-user--')?.temporaryAccessCode, '-');
		assert.equal(parsePocketInvitationCode('MDGABC--key'), undefined);
		assert.equal(parsePocketInvitationCode('MDGABC-user-'), undefined);
	});

	it('rejects line terminators anywhere in an invitation', () => {
		for (const lineTerminator of ['\n', '\r', '\u2028', '\u2029']) {
			for (const invitationCode of [
				`MDG${lineTerminator}ABC-user-key`,
				`MDGABC-us${lineTerminator}er-key`,
				`MDGABC-user-k${lineTerminator}ey`,
				`MDGABC-user-key${lineTerminator}`,
			]) {
				assert.equal(parsePocketInvitationCode(invitationCode), undefined);
			}
		}
	});

	it('handles long valid and malformed invitations', () => {
		const accessCode = 'key-'.repeat(25_000);
		assert.equal(parsePocketInvitationCode(`MDGABC-user-${accessCode}`)?.temporaryAccessCode, accessCode);
		assert.equal(parsePocketInvitationCode(`MDGABC-user-${accessCode}\n`), undefined);
		assert.equal(parsePocketInvitationCode(`MDGABC-${'user'.repeat(25_000)}-`), undefined);
	});
});
