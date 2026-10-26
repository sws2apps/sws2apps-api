import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getUserCapabilities } from '#domain/users/user-capabilities.js';
import type { AppRoleType } from '#domain/users/app-role.js';

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

	const schedulingRoles: {
		role: AppRoleType;
		allGroups: boolean;
		scopeAdmin: boolean;
		scheduler: boolean;
	}[] = [
		{ role: 'admin', allGroups: true, scopeAdmin: true, scheduler: true },
		{ role: 'coordinator', allGroups: true, scopeAdmin: true, scheduler: true },
		{ role: 'secretary', allGroups: true, scopeAdmin: true, scheduler: true },
		{ role: 'service_overseer', allGroups: true, scopeAdmin: true, scheduler: true },
		{ role: 'field_service_schedule', allGroups: true, scopeAdmin: false, scheduler: true },
		{ role: 'group_overseers', allGroups: false, scopeAdmin: false, scheduler: true },
		{ role: 'language_group_overseers', allGroups: false, scopeAdmin: false, scheduler: true },
		{ role: 'publisher', allGroups: false, scopeAdmin: false, scheduler: false },
		{ role: 'elder', allGroups: false, scopeAdmin: false, scheduler: false },
		{ role: 'midweek_schedule', allGroups: false, scopeAdmin: false, scheduler: false },
	];

	for (const { role, allGroups, scopeAdmin, scheduler } of schedulingRoles) {
		it(`keeps ${role} scheduling, group scope and administration access separate`, () => {
			const capabilities = getUserCapabilities([role]);

			assert.equal(capabilities.fieldServiceAllGroups, allGroups);
			assert.equal(capabilities.fieldServiceScheduler, scheduler);
			assert.equal(capabilities.serviceCommiteeRole, scopeAdmin);
		});
	}
});
