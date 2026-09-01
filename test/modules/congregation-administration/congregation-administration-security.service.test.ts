import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { updateCongregationSecuritySetting } from '#modules/congregation-administration/services/congregation-administration-security.service.js';
import type { CongSettingsType } from '#modules/congregations/types/congregations.types.js';

describe('congregation security settings', () => {
	it('updates the selected security value without mutating current settings', () => {
		const currentSettings = {
			cong_access_code: 'old-access-code',
			cong_master_key: 'old-master-key',
			data_sync: { value: true, updatedAt: '' },
		} as CongSettingsType;

		const updatedSettings = updateCongregationSecuritySetting(
			currentSettings,
			'cong_master_key',
			'new-master-key',
		);

		assert.equal(updatedSettings.cong_master_key, 'new-master-key');
		assert.equal(updatedSettings.cong_access_code, 'old-access-code');
		assert.equal(currentSettings.cong_master_key, 'old-master-key');
		assert.notEqual(updatedSettings, currentSettings);
	});
});
