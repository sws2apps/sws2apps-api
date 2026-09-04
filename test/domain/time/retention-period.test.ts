import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	isTimestampOnOrAfter,
	subtractUtcMonths,
} from '#domain/time/retention-period.js';

describe('calendar-month retention periods', () => {
	it('subtracts calendar months without mutating the supplied date', () => {
		const currentTime = new Date('2026-09-04T10:30:00.000Z');

		const cutoff = subtractUtcMonths(currentTime, 3);

		assert.equal(cutoff.toISOString(), '2026-06-04T10:30:00.000Z');
		assert.equal(currentTime.toISOString(), '2026-09-04T10:30:00.000Z');
	});

	it('clamps month-end dates to the final day of the target month', () => {
		const cutoff = subtractUtcMonths(
			new Date('2026-05-31T10:30:00.000Z'),
			3,
		);

		assert.equal(cutoff.toISOString(), '2026-02-28T10:30:00.000Z');
	});

	it('accepts timestamps at the cutoff and rejects old or malformed values', () => {
		const cutoff = new Date('2026-06-04T10:30:00.000Z');

		assert.equal(
			isTimestampOnOrAfter('2026-06-04T10:30:00.000Z', cutoff),
			true,
		);
		assert.equal(
			isTimestampOnOrAfter('2026-06-04T10:29:59.999Z', cutoff),
			false,
		);
		assert.equal(isTimestampOnOrAfter('not-a-date', cutoff), false);
	});

	it('rejects invalid dates and month counts', () => {
		assert.throws(
			() => subtractUtcMonths(new Date('invalid'), 3),
			new RangeError('Current time must be a valid date'),
		);
		assert.throws(
			() => subtractUtcMonths(new Date(), -1),
			new RangeError('Months must be a non-negative integer'),
		);
	});
});
