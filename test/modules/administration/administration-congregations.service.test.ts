import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	AdministrationCongregationError,
	createAdministrationCongregation,
	deleteAdministrationCongregation,
} from '#modules/administration/services/administration-congregations.service.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/index.js';
import type { User } from '#modules/users/index.js';

describe('administration congregation lifecycle', () => {
	let originalCongregations: Congregation[];

	beforeEach(() => {
		originalCongregations = CongregationsList.list;
		CongregationsList.list = [];
	});

	afterEach(() => {
		CongregationsList.list = originalCongregations;
	});

	it('rejects creation when a congregation already has the same country and name', async () => {
		const existingCongregation = new Congregation('congregation-1');
		existingCongregation.settings.country_code = 'MG';
		existingCongregation.settings.cong_name = 'Central';
		CongregationsList.add(existingCongregation);

		await assert.rejects(
			createAdministrationCongregation('MG', 'Central'),
			(error: unknown) => {
				assert.ok(error instanceof AdministrationCongregationError);
				assert.equal(error.code, 'CONGREGATION_EXISTS');
				return true;
			},
		);
	});

	it('prevents deletion while the congregation still has active members', async () => {
		const activeCongregation = new Congregation('congregation-1');
		activeCongregation.members = [{ id: 'user-1' } as User];
		CongregationsList.add(activeCongregation);

		await assert.rejects(
			deleteAdministrationCongregation(activeCongregation.id),
			(error: unknown) => {
				assert.ok(error instanceof AdministrationCongregationError);
				assert.equal(error.code, 'CONGREGATION_ACTIVE');
				return true;
			},
		);
	});

	it('reports a missing congregation before attempting deletion', async () => {
		await assert.rejects(
			deleteAdministrationCongregation('missing-congregation'),
			(error: unknown) => {
				assert.ok(error instanceof AdministrationCongregationError);
				assert.equal(error.code, 'CONGREGATION_NOT_FOUND');
				return true;
			},
		);
	});
});
