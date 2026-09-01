import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RequestTrackerType } from '#platform/runtime/request-tracker.js';
import {
	findRequestTrackerEntry,
	hasReachedFailedRequestLimit,
	removeRequestTrackerEntry,
	setRequestTrackerEntry,
} from '#platform/runtime/request-tracker.js';

const createEntry = (ip: string, failedLoginAttempt = 0): RequestTrackerType => ({
	ip,
	city: 'Unknown',
	reqInProgress: false,
	failedLoginAttempt,
	retryOn: undefined,
});

describe('request tracker state', () => {
	it('updates an IP entry without changing other clients', () => {
		const firstClient = createEntry('192.0.2.1');
		const secondClient = createEntry('192.0.2.2');
		const tracker = [firstClient, secondClient];
		const updatedFirstClient = createEntry('192.0.2.1', 2);

		setRequestTrackerEntry(tracker, updatedFirstClient);

		assert.deepEqual(tracker, [updatedFirstClient, secondClient]);
		assert.equal(findRequestTrackerEntry(tracker, '192.0.2.1'), updatedFirstClient);
	});

	it('does not remove another client when an IP is absent', () => {
		const existingClient = createEntry('192.0.2.1');
		const tracker = [existingClient];

		assert.equal(removeRequestTrackerEntry(tracker, '192.0.2.99'), false);
		assert.deepEqual(tracker, [existingClient]);
	});

	it('adds and safely removes a new IP entry', () => {
		const tracker: RequestTrackerType[] = [];
		const entry = createEntry('192.0.2.1');

		setRequestTrackerEntry(tracker, entry);
		assert.deepEqual(tracker, [entry]);
		assert.equal(removeRequestTrackerEntry(tracker, entry.ip), true);
		assert.deepEqual(tracker, []);
	});

	it('keeps blocking attempt counts above the threshold', () => {
		assert.equal(hasReachedFailedRequestLimit(2), false);
		assert.equal(hasReachedFailedRequestLimit(3), true);
		assert.equal(hasReachedFailedRequestLimit(4), true);
	});
});
