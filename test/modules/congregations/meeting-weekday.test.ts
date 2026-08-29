import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toMondayFirstWeekday } from '../../../src/modules/congregations/meeting-weekday.js';

describe('meeting weekday conversion', () => {
	it('moves Sunday to the end of a Monday-first week', () => {
		assert.equal(toMondayFirstWeekday(0), 6);
	});

	it('shifts the other weekdays back by one position', () => {
		assert.equal(toMondayFirstWeekday(1), 0);
		assert.equal(toMondayFirstWeekday(6), 5);
	});
});
