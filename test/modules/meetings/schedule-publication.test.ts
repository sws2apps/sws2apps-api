import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { prepareSchedulePublication } from '#modules/meetings/schedule-publication.js';

describe('meeting schedule publication', () => {
	it('serializes sources, schedules, and outgoing talks for storage', () => {
		const publication = prepareSchedulePublication({
			sources: [{ id: 'source-1' }],
			schedules: [{ id: 'schedule-1' }],
			talks: [],
		});

		assert.deepEqual(publication, {
			serializedSources: '[{"id":"source-1"}]',
			serializedSchedules: '[{"id":"schedule-1"}]',
			serializedTalks: '[]',
		});
	});

	it('omits outgoing talks when they were not submitted', () => {
		const publication = prepareSchedulePublication({ sources: [], schedules: [] });

		assert.equal(publication.serializedTalks, undefined);
	});
});
