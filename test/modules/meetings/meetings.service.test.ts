import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CongregationsList } from '../../../src/modules/congregations/congregations.js';
import {
	getMeetingSchedules,
	MeetingAccessError,
} from '../../../src/modules/meetings/meetings.service.js';

describe('meeting congregation access', () => {
	it('returns a stable error when the congregation does not exist', async () => {
		const originalCongregations = CongregationsList.list;
		CongregationsList.list = [];

		try {
			await assert.rejects(
				getMeetingSchedules('missing-congregation', 'user-1'),
				(error: unknown) =>
					error instanceof MeetingAccessError && error.code === 'CONGREGATION_NOT_FOUND',
			);
		} finally {
			CongregationsList.list = originalCongregations;
		}
	});
});
