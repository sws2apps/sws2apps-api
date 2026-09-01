import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { synchronizeCongregationApplication } from '#modules/congregations/congregation-applications.service.js';

describe('congregation application state', () => {
	it('adds a newly submitted application without mutating current state', () => {
		const currentApplications = [{ request_id: 'existing', status: 'approved' }];
		const submittedApplication = {
			request_id: 'new',
			person_uid: 'person-1',
			months: ['2026/09'],
			submitted: '2026-08-30T00:00:00.000Z',
		};

		const applications = synchronizeCongregationApplication(
			currentApplications,
			submittedApplication,
		);

		assert.equal(applications.length, 2);
		assert.equal(applications[1].request_id, 'new');
		assert.equal(applications[1].person_uid, 'person-1');
		assert.deepEqual(currentApplications, [
			{ request_id: 'existing', status: 'approved' },
		]);
	});

	it('updates the managed fields while preserving unrelated stored data', () => {
		const currentApplications = [{
			request_id: 'request-1',
			person_uid: 'person-1',
			status: 'pending',
			internal_note: 'keep this',
		}];
		const updatedApplication = {
			request_id: 'request-1',
			person_uid: 'person-2',
			status: 'approved',
			updatedAt: '2026-08-30T00:00:00.000Z',
		};

		const applications = synchronizeCongregationApplication(
			currentApplications,
			updatedApplication,
		);

		assert.equal(applications.length, 1);
		assert.equal(applications[0].person_uid, 'person-2');
		assert.equal(applications[0].status, 'approved');
		assert.equal(applications[0].internal_note, 'keep this');
		assert.equal(currentApplications[0].status, 'pending');
	});
});
