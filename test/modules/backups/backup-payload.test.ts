import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	BackupPayloadError,
	parseBackupPayload,
} from '../../../src/modules/backups/backup-payload.js';

describe('backup payload parsing', () => {
	it('accepts object and serialized payloads with valid metadata', () => {
		const payload = {
			metadata: { user_settings: '2026-08-30T10:00:00.000Z' },
			app_settings: {},
		};

		assert.deepEqual(parseBackupPayload(payload), payload);
		assert.deepEqual(parseBackupPayload(JSON.stringify(payload)), payload);
	});

	it('rejects malformed JSON and invalid metadata structures', () => {
		assert.throws(() => parseBackupPayload('{invalid-json'), BackupPayloadError);
		assert.throws(() => parseBackupPayload([]), BackupPayloadError);
		assert.throws(
			() => parseBackupPayload({ metadata: { user_settings: 123 } }),
			BackupPayloadError,
		);
		assert.throws(
			() => parseBackupPayload({ metadata: {}, app_settings: [] }),
			BackupPayloadError,
		);
	});
});
