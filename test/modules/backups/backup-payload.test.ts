import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	BackupPayloadError,
	parseBackupPayload,
} from '#modules/backups/backup-payload.js';

describe('backup payload parsing', () => {
	it('accepts object and serialized payloads with valid metadata', () => {
		const payload = {
			metadata: { user_settings: '2026-08-30T10:00:00.000Z' },
			app_settings: {},
		};

		assert.deepEqual(parseBackupPayload(payload), payload);
		assert.deepEqual(parseBackupPayload(JSON.stringify(payload)), payload);
	});

	it('accepts a complete payload with every documented schema field', () => {
		const payload = {
			metadata: {
				user_settings: '2026-08-30T10:00:00.000Z',
				cong_settings: '2026-08-30T10:00:01.000Z',
			},
			app_settings: {
				cong_settings: { data_sync: { value: true, updatedAt: '2026-08-30T10:00:00.000Z' } },
				user_settings: { firstname: { value: 'Anna', updatedAt: '2026-08-30T10:00:00.000Z' } },
			},
			speakers_key: 'speakers-key',
			outgoing_talks: [{ id: 'talk-1' }],
			persons: [{ person_uid: 'p-1', person_data: {} }],
			field_service_groups: [{ _deleted: false }],
			cong_users: [
				{ id: 'u-1', local_uid: 'p-1', role: ['admin', 'secretary'] },
				{ id: 'u-2', role: ['ms'] },
			],
		};

		assert.deepEqual(parseBackupPayload(payload), payload);
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

	it('rejects record datasets that are not arrays of records', () => {
		assert.throws(() => parseBackupPayload({
			metadata: {},
			persons: { person_uid: 'p-1' },
		}), BackupPayloadError);

		assert.throws(() => parseBackupPayload({
			metadata: {},
			sources: [42],
		}), BackupPayloadError);

		assert.throws(() => parseBackupPayload({
			metadata: {},
			visiting_speakers: ['speaker-1'],
		}), BackupPayloadError);
	});

	it('rejects malformed nested settings containers', () => {
		assert.throws(() => parseBackupPayload({
			metadata: {},
			app_settings: { cong_settings: 'disabled' },
		}), BackupPayloadError);

		assert.throws(() => parseBackupPayload({
			metadata: {},
			app_settings: { user_settings: ['settings-list'] },
		}), BackupPayloadError);
	});

	it('rejects malformed speakers key and talks', () => {
		assert.throws(() => parseBackupPayload({
			metadata: {},
			speakers_key: 128,
		}), BackupPayloadError);

		assert.throws(() => parseBackupPayload({
			metadata: {},
			outgoing_talks: 'no-talks',
		}), BackupPayloadError);
	});

	it('rejects malformed congregation user records', () => {
		assert.throws(() => parseBackupPayload({
			metadata: {},
			cong_users: [{ id: 'u-1', role: 'admin' }],
		}), BackupPayloadError);

		assert.throws(() => parseBackupPayload({
			metadata: {},
			cong_users: [{ local_uid: 'p-1' }],
		}), BackupPayloadError);

		assert.throws(() => parseBackupPayload({
			metadata: {},
			cong_users: [{ id: 7 }],
		}), BackupPayloadError);

		assert.throws(() => parseBackupPayload({
			metadata: {},
			cong_users: 'not-a-list',
		}), BackupPayloadError);
	});

	it('rejects congregation user records with unknown role values', () => {
		assert.throws(() => parseBackupPayload({
			metadata: {},
			cong_users: [{ id: 'u-1', role: ['admin', 'superuser'] }],
		}), BackupPayloadError);
	});

	it('rejects congregation settings with undocumented keys', () => {
		assert.throws(() => parseBackupPayload({
			metadata: {},
			app_settings: { cong_settings: { future_setting: { enabled: true } } },
		}), BackupPayloadError);

		assert.throws(() => parseBackupPayload({
			metadata: {},
			app_settings: { cong_settings: { data_sync: { value: true, updatedAt: '2026-08-30T10:00:00.000Z' }, unknown_future_key: true } },
		}), BackupPayloadError);
	});

	it('rejects oversized record datasets', () => {
		const oversized = {
			metadata: {},
			persons: Array.from({ length: 100_001 }, (_, index) => ({ id: `p-${index}` })),
		};

		assert.throws(() => parseBackupPayload(oversized), BackupPayloadError);
	});

	it('rejects payloads nested beyond the allowed depth', () => {
		let deep: unknown = {};
		for (let depth = 0; depth < 70; depth += 1) {
			deep = { nested: deep };
		}

		assert.throws(() => parseBackupPayload({ metadata: {}, nested: deep }), BackupPayloadError);
	});

	it('preserves undocumented top-level and settings fields', () => {
		const payload = {
			metadata: {},
			app_settings: { future_setting: { enabled: true } },
			future_dataset: [{ value: 1 }],
		};

		assert.deepEqual(parseBackupPayload(payload), payload);
	});

	it('accepts a chunked-assembled payload without a metadata field', () => {
		const payload = {
			app_settings: {
				cong_settings: { data_sync: { value: true, updatedAt: '2026-08-30T10:00:00.000Z' } },
				user_settings: { firstname: { value: 'Anna', updatedAt: '2026-08-30T10:00:00.000Z' } },
			},
			persons: [{ person_uid: 'p-1' }],
			sched: [{ id: 'sched-1' }],
		};

		assert.deepEqual(parseBackupPayload(payload, { requireMetadata: false }), payload);
	});

	it('rejects a regular upload that omits the metadata object', () => {
		const payload = {
			app_settings: {},
			persons: [{ person_uid: 'p-1' }],
		};

		assert.throws(
			() => parseBackupPayload(payload, { requireMetadata: true }),
			BackupPayloadError,
		);
		assert.throws(() => parseBackupPayload(payload), BackupPayloadError);
	});

	it('accepts congregation settings the Organized app ships today', () => {
		const payload = {
			app_settings: {
				cong_settings: {
					cong_id: 'CD9133F3-6AD0-4C58-80D8-1118D68625EB',
					events_multiday_display: 'encrypted-value',
					attendance_deaf_record: 'encrypted-value',
					source_material: 'encrypted-value',
					aux_class_fsg: 'encrypted-value',
					aux_class_qualifications: 'encrypted-value',
					first_day_week: 'encrypted-value',
					schedule_songs_weekend: 'encrypted-value',
					cong_migrated: false,
				},
			},
		};

		assert.deepEqual(parseBackupPayload(payload, { requireMetadata: false }), payload);
	});
});