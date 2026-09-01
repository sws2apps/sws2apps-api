import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	parsePocketBackupMetadata,
	PocketBackupError,
} from '#modules/pockets/pocket-backup.service.js';

describe('Pocket backup metadata', () => {
	it('accepts a JSON object containing string timestamps', () => {
		const metadata = parsePocketBackupMetadata('{"persons":"2026-08-01T00:00:00.000Z"}');

		assert.deepEqual(metadata, { persons: '2026-08-01T00:00:00.000Z' });
	});

	it('rejects malformed JSON and non-string metadata values', () => {
		for (const metadata of ['not-json', '[]', '{"persons":123}']) {
			assert.throws(
				() => parsePocketBackupMetadata(metadata),
				(error: unknown) =>
					error instanceof PocketBackupError && error.code === 'INVALID_METADATA',
			);
		}
	});
});
