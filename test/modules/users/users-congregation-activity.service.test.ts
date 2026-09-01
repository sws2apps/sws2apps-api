import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeIncomingFieldServiceReport } from '#modules/users/users-congregation-activity.service.js';

describe('incoming user field service reports', () => {
	it('adds a report with a server-generated identity', () => {
		const report = {
			report_month: '2026/08',
			person_uid: 'person-1',
			hours: 5,
		};

		const result = mergeIncomingFieldServiceReport([], report, () => 'report-1');

		assert.deepEqual(result, [{ ...report, report_id: 'report-1' }]);
	});

	it('updates the existing report without mutating the stored input', () => {
		const currentReports = [{
			report_id: 'report-1',
			report_month: '2026/08',
			person_uid: 'person-1',
			hours: 2,
		}];
		const updatedReport = {
			report_month: '2026/08',
			person_uid: 'person-1',
			hours: 7,
			comments: 'Updated',
		};

		const result = mergeIncomingFieldServiceReport(currentReports, updatedReport);

		assert.equal(result[0].report_id, 'report-1');
		assert.equal(result[0].hours, 7);
		assert.equal(result[0].hours_credits, 7);
		assert.equal(result[0].comments, 'Updated');
		assert.equal(currentReports[0].hours, 2);
	});
});
