import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	BackupMetadataError,
	findBackupMetadataConflict,
	parseBackupMetadata,
} from '../../../src/modules/backups/backup-metadata.js';

describe('backup metadata parsing', () => {
	it('accepts a JSON object containing string timestamps', () => {
		assert.deepEqual(
			parseBackupMetadata('{"user_settings":"2026-08-30T10:00:00.000Z"}'),
			{ user_settings: '2026-08-30T10:00:00.000Z' },
		);
	});

	it('rejects malformed JSON and non-string metadata values', () => {
		assert.throws(
			() => parseBackupMetadata('{invalid-json'),
			BackupMetadataError,
		);
		assert.throws(
			() => parseBackupMetadata('{"user_settings":123}'),
			BackupMetadataError,
		);
		assert.throws(
			() => parseBackupMetadata('[]'),
			BackupMetadataError,
		);
	});
});

describe('backup metadata conflicts', () => {
	it('returns the first server value newer than the incoming value', () => {
		assert.deepEqual(
			findBackupMetadataConflict(
				{ user_settings: '2026-08-28T12:00:00.000Z' },
				{ user_settings: '2026-08-27T12:00:00.000Z' },
			),
			{
				key: 'user_settings',
				currentValue: '2026-08-28T12:00:00.000Z',
				incomingValue: '2026-08-27T12:00:00.000Z',
			},
		);
	});

	it('returns no conflict when incoming metadata is current', () => {
		assert.equal(
			findBackupMetadataConflict(
				{ user_settings: '2026-08-28T12:00:00.000Z' },
				{ user_settings: '2026-08-28T12:00:00.000Z' },
			),
			undefined,
		);
	});
});
