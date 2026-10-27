import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeParticipantRecords } from '#modules/congregations/index.js';

describe('volunteer activity participant merge', () => {
	it('replaces matching participations and keeps everyone else', () => {
		const stored = [
			{ participation_uid: 'activity-1_person-1', participation_data: 'old' },
			{ participation_uid: 'activity-1_person-2', participation_data: 'other user' },
		];
		const incoming = [
			{ participation_uid: 'activity-1_person-1', participation_data: 'new' },
			{ participation_uid: 'activity-2_person-1', participation_data: 'added' },
		];

		assert.deepEqual(mergeParticipantRecords(stored, incoming), [
			{ participation_uid: 'activity-1_person-1', participation_data: 'new' },
			{ participation_uid: 'activity-1_person-2', participation_data: 'other user' },
			{ participation_uid: 'activity-2_person-1', participation_data: 'added' },
		]);
	});
});
