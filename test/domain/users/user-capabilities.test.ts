import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getUserCapabilities } from '../../../src/domain/users/user-capabilities.js';

describe('user capabilities', () => {
	it('grants administration capabilities to congregation administrators', () => {
		const capabilities = getUserCapabilities(['admin']);

		assert.equal(capabilities.adminRole, true);
		assert.equal(capabilities.elderRole, true);
		assert.equal(capabilities.scheduleEditor, true);
		assert.equal(capabilities.reportEditorRole, true);
		assert.equal(capabilities.personViewer, true);
		assert.equal(capabilities.personMinimal, false);
	});

	it('grants only schedule-related access to schedule roles', () => {
		const capabilities = getUserCapabilities(['midweek_schedule']);

		assert.equal(capabilities.adminRole, false);
		assert.equal(capabilities.scheduleEditor, true);
		assert.equal(capabilities.personViewer, true);
		assert.equal(capabilities.reportEditorRole, false);
	});

	it('keeps publishers on the minimal person-data path', () => {
		const capabilities = getUserCapabilities(['publisher']);

		assert.equal(capabilities.isPublisher, true);
		assert.equal(capabilities.personViewer, false);
		assert.equal(capabilities.personMinimal, true);
	});

	it('allows coordinators and secretaries to inherit administration access', () => {
		assert.equal(getUserCapabilities(['coordinator']).adminRole, true);
		assert.equal(getUserCapabilities(['secretary']).adminRole, true);
	});
});
