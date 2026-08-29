import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeIncomingData } from '../../../src/modules/backups/incoming-data-merge.js';

describe('incoming backup data merge', () => {
	it('replaces a timestamped record when the incoming value is newer', () => {
		const localData = {
			setting: { value: 'local', updatedAt: '2026-08-28T10:00:00.000Z' },
		};
		const incomingData = {
			setting: { value: 'incoming', updatedAt: '2026-08-29T10:00:00.000Z' },
		};

		const result = mergeIncomingData(localData, incomingData);

		assert.equal(result, localData);
		assert.deepEqual(localData.setting, incomingData.setting);
	});

	it('keeps a timestamped record when the incoming value is older', () => {
		const localSetting = {
			value: 'local',
			updatedAt: '2026-08-29T10:00:00.000Z',
		};
		const localData = { setting: localSetting };
		const incomingData = {
			setting: { value: 'incoming', updatedAt: '2026-08-28T10:00:00.000Z' },
		};

		mergeIncomingData(localData, incomingData);

		assert.equal(localData.setting, localSetting);
		assert.equal(localData.setting.value, 'local');
	});

	it('recursively merges nested records without timestamps', () => {
		const localData = {
			preferences: {
				language: 'en',
				theme: 'light',
			},
		};
		const incomingData = {
			preferences: {
				language: 'fr',
				theme: 'light',
			},
		};

		mergeIncomingData(localData, incomingData);

		assert.deepEqual(localData.preferences, {
			language: 'fr',
			theme: 'light',
		});
	});

	it('copies primitive values from the incoming record', () => {
		const localData = { name: 'Local', enabled: false };
		const incomingData = { name: 'Incoming', enabled: true };

		mergeIncomingData(localData, incomingData);

		assert.deepEqual(localData, { name: 'Incoming', enabled: true });
	});
});
