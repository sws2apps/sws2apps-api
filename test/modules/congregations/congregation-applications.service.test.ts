import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	removeCongregationApplication,
	saveCongregationApplication,
	synchronizeCongregationApplication,
} from '#modules/congregations/services/congregation-applications.service.js';
import { Congregation } from '#modules/congregations/congregation.js';

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

	it('persists a submission and removes only applications with valid expired dates', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.ap_applications = [
			{ request_id: 'expired', expired: '2026-09-04T23:59:59.999Z' },
			{ request_id: 'current', expired: '2026-09-05T00:00:00.000Z' },
			{ request_id: 'invalid', expired: 'not-a-date' },
		];
		const completedOperations: string[] = [];

		await saveCongregationApplication(
			congregation,
			{ request_id: 'new', status: 'pending' },
			{
				saveApplication: async (_congregationId, application) => {
					completedOperations.push(`save:${application.request_id}`);
				},
				deleteApplication: async (_congregationId, requestId) => {
					completedOperations.push(`delete:${requestId}`);
				},
				getCurrentDate: () => new Date('2026-09-05T00:00:00.000Z'),
			},
		);

		assert.deepEqual(completedOperations, ['save:new', 'delete:expired']);
		assert.deepEqual(
			congregation.ap_applications.map((application) => application.request_id),
			['current', 'invalid', 'new'],
		);
	});

	it('leaves local application state unchanged when saving fails', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.ap_applications = [{ request_id: 'existing', status: 'pending' }];

		await assert.rejects(
			saveCongregationApplication(
				congregation,
				{ request_id: 'new', status: 'pending' },
				{
					saveApplication: async () => {
						throw new Error('storage unavailable');
					},
					deleteApplication: async () => undefined,
					getCurrentDate: () => new Date('2026-09-05T00:00:00.000Z'),
				},
			),
			/storage unavailable/,
		);

		assert.deepEqual(congregation.ap_applications, [
			{ request_id: 'existing', status: 'pending' },
		]);
	});

	it('removes local state only after the stored application is deleted', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.ap_applications = [{ request_id: 'request-1' }];

		await removeCongregationApplication(congregation, 'request-1', {
			deleteApplication: async () => {
				assert.equal(congregation.ap_applications.length, 1);
			},
		});

		assert.deepEqual(congregation.ap_applications, []);
	});

	it('keeps local state when deleting the stored application fails', async () => {
		const congregation = new Congregation('congregation-1');
		congregation.ap_applications = [{ request_id: 'request-1' }];

		await assert.rejects(
			removeCongregationApplication(congregation, 'request-1', {
				deleteApplication: async () => {
					throw new Error('storage unavailable');
				},
			}),
			/storage unavailable/,
		);

		assert.deepEqual(congregation.ap_applications, [{ request_id: 'request-1' }]);
	});
});
