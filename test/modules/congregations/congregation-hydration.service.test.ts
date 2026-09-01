import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import {
	type CongregationHydrationDataSource,
	hydrateCongregation,
	loadAllCongregations,
} from '#modules/congregations/services/congregation-hydration.service.js';

const createDataSource = (ids = ['congregation-1']): CongregationHydrationDataSource => {
	return {
		getIds: async () => ids,
		getDetails: async (congregationId) => {
			const defaults = new Congregation(congregationId);
			const settings = structuredClone(defaults.settings);
			settings.cong_name = `Congregation ${congregationId}`;

			return {
				createdAt: '2026-09-01T10:00:00.000Z',
				settings,
				outgoing_speakers: defaults.outgoing_speakers,
				metadata: {
					branch_cong_analysis: '',
					branch_field_service_reports: '',
					field_service_groups: '',
					cong_field_service_reports: '',
					meeting_attendance: '',
					persons: 'metadata-date',
					schedules: '',
					cong_settings: '',
					sources: '',
					speakers_congregations: '',
					visiting_speakers: '',
					incoming_reports: '',
					public_sources: '',
					public_schedules: '',
				},
				flags: ['flag-1'],
				join_requests: [],
				incoming_reports: JSON.stringify([{ report_id: 'report-1' }]),
				applications: [{ request_id: 'application-1' }],
			};
		},
	};
};

describe('congregation hydration', () => {
	it('populates persisted state and parses incoming reports', async () => {
		const congregation = new Congregation('congregation-1');

		await hydrateCongregation(congregation, createDataSource());

		assert.equal(congregation.createdAt, '2026-09-01T10:00:00.000Z');
		assert.equal(congregation.settings.cong_name, 'Congregation congregation-1');
		assert.equal(congregation.metadata.persons, 'metadata-date');
		assert.deepEqual(congregation.incoming_reports, [{ report_id: 'report-1' }]);
		assert.deepEqual(congregation.flags, ['flag-1']);
	});

	it('constructs and hydrates every persisted congregation', async () => {
		const congregations = await loadAllCongregations(
			1,
			createDataSource(['congregation-1', 'congregation-2']),
		);

		assert.deepEqual(
			congregations.map((congregation) => congregation.id),
			['congregation-1', 'congregation-2'],
		);
		assert.equal(congregations[1]?.settings.cong_name, 'Congregation congregation-2');
	});
});
