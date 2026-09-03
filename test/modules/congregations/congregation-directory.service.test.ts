import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	getAvailableCountries,
	searchCongregationDirectory,
	verifyCongregationDirectoryRecord,
} from '#modules/congregations/index.js';
import { CongregationDirectoryRequestError } from '#platform/congregation-directory/congregation-directory-client.js';
import { CountryCatalogRequestError } from '#platform/countries/country-client.js';

const directoryRecord = {
	congName: 'Central',
	congGuid: 'congregation-guid',
	address: 'Central district',
	location: { lat: -18.8792, lng: 47.5079 },
	midweekMeetingTime: { weekday: 2, time: '18:30:00' },
	weekendMeetingTime: { weekday: 0, time: '09:00:00' },
	circuit: 'MG-01',
};

describe('country catalog access', () => {
	it('returns countries using the requested language', async () => {
		const countries = [
			{
				countryGuid: 'country-guid',
				countryCode: 'MG',
				countryName: 'Madagascar',
			},
		];

		const result = await getAvailableCountries('MG', {
			getCountries: async (language) => {
				assert.equal(language, 'MG');
				return countries;
			},
		});

		assert.deepEqual(result, { countries });
	});

	it('returns the status from an expected catalog request failure', async () => {
		const result = await getAvailableCountries('E', {
			getCountries: async () => {
				throw new CountryCatalogRequestError(502);
			},
		});

		assert.deepEqual(result, { errorStatusCode: 502 });
	});

	it('does not hide unexpected catalog failures', async () => {
		const unexpectedError = new Error('Invalid catalog response');

		await assert.rejects(
			getAvailableCountries('E', {
				getCountries: async () => {
					throw unexpectedError;
				},
			}),
			(error: unknown) => error === unexpectedError,
		);
	});
});

describe('congregation directory search', () => {
	it('passes the exact search query to the directory client', async () => {
		const result = await searchCongregationDirectory('MG', 'E', 'Central', {
			searchCongregations: async (query) => {
				assert.deepEqual(query, {
					country: 'MG',
					language: 'E',
					name: 'Central',
				});
				return [directoryRecord];
			},
		});

		assert.deepEqual(result, { congregations: [directoryRecord] });
	});

	it('returns the status from an expected directory request failure', async () => {
		const result = await searchCongregationDirectory('MG', 'E', 'Central', {
			searchCongregations: async () => {
				throw new CongregationDirectoryRequestError(503);
			},
		});

		assert.deepEqual(result, { errorStatusCode: 503 });
	});
});

describe('congregation directory verification', () => {
	it('maps supported language codes to the external directory format', async () => {
		const queries: { country: string; language: string; name: string }[] = [];
		const verifyCongregation = async (query: {
			country: string;
			language: string;
			name: string;
		}) => {
			queries.push(query);
			return [directoryRecord];
		};

		await verifyCongregationDirectoryRecord('MG', 'mlg', 'Central', {
			verifyCongregation,
		});
		await verifyCongregationDirectoryRecord('MG', 'unsupported', 'Central', {
			verifyCongregation,
		});

		assert.deepEqual(queries, [
			{ country: 'MG', language: 'MG', name: 'Central' },
			{ country: 'MG', language: 'E', name: 'Central' },
		]);
	});

	it('returns the status from an expected verification failure', async () => {
		const result = await verifyCongregationDirectoryRecord('MG', 'eng', 'Central', {
			verifyCongregation: async () => {
				throw new CongregationDirectoryRequestError(504);
			},
		});

		assert.deepEqual(result, { errorStatusCode: 504 });
	});
});
