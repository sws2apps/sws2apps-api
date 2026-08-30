import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { filterBackupMetadata } from '../../../src/modules/users/user-backup-upload.service.js';

describe('user backup upload metadata', () => {
	it('keeps only settings metadata when congregation data sync is disabled', () => {
		const metadata = {
			user_settings: '2026-08-30T10:00:00.000Z',
			cong_settings: '2026-08-30T10:00:00.000Z',
			persons: '2026-08-30T10:00:00.000Z',
			schedules: '2026-08-30T10:00:00.000Z',
		};

		const result = filterBackupMetadata(metadata, false);

		assert.deepEqual(result, {
			user_settings: '2026-08-30T10:00:00.000Z',
			cong_settings: '2026-08-30T10:00:00.000Z',
		});
	});

	it('keeps all incoming metadata when congregation data sync is enabled', () => {
		const metadata = {
			user_settings: 'user-date',
			persons: 'person-date',
		};

		const result = filterBackupMetadata(metadata, true);

		assert.deepEqual(result, metadata);
	});
});
