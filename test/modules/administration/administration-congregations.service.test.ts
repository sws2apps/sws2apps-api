import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
	AdministrationCongregationError,
	createAdministrationCongregation,
	deleteAdministrationCongregation,
} from '#modules/administration/services/administration-congregations.service.js';
import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/index.js';
import type { CongregationCreateInfoType } from '#modules/congregations/index.js';
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

	it('creates a congregation with the selected country details', async () => {
		let createdInput: CongregationCreateInfoType | undefined;
		const expectedList = [{
			id: 'congregation-1',
			country_code: 'MG',
			country_name: 'Madagascar',
			cong_name: 'Central',
			cong_prefix: '',
			cong_number: '',
			cong_guid: '',
			createdAt: '',
			data_sync: false,
		}];

		const result = await createAdministrationCongregation('MG', 'Central', {
			findCountry: async () => ({
				country: {
					countryCode: 'MG',
					countryGuid: 'country-guid',
					countryName: 'Madagascar',
				},
			}),
			createCongregation: async (input) => {
				createdInput = input;
				return new Congregation('congregation-1');
			},
			listCongregations: async () => expectedList,
		});

		assert.deepEqual(result, expectedList);
		assert.ok(createdInput);
		assert.equal(createdInput.country_guid, 'country-guid');
		assert.equal(createdInput.cong_name, 'Central');
	});

	it('deletes an inactive congregation and returns the refreshed list', async () => {
		const congregation = new Congregation('congregation-1');
		CongregationsList.add(congregation);
		let deletedCongregationId: string | undefined;

		const result = await deleteAdministrationCongregation(congregation.id, {
			deleteCongregation: async (congregationId) => {
				deletedCongregationId = congregationId;
				CongregationsList.removeById(congregationId);
			},
			listCongregations: async () => [],
		});

		assert.equal(deletedCongregationId, congregation.id);
		assert.deepEqual(result, []);
	});
});
