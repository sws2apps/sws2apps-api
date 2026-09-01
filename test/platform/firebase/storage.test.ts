import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildStoragePath } from '#platform/firebase/storage.js';

describe('Firebase storage paths', () => {
	it('places each supported record type under its existing v3 prefix', () => {
		assert.equal(
			buildStoragePath({ type: 'congregation', path: 'congregation-1/settings.txt' }),
			'v3/congregations/congregation-1/settings.txt',
		);
		assert.equal(
			buildStoragePath({ type: 'user', path: 'user-1/settings.txt' }),
			'v3/users/user-1/settings.txt',
		);
		assert.equal(
			buildStoragePath({ type: 'api', path: 'flags.txt' }),
			'v3/api/flags.txt',
		);
	});

	it('preserves operations that do not support API storage', () => {
		assert.equal(
			buildStoragePath({ type: 'api', path: 'flags.txt' }, false),
			'v3/',
		);
	});
});
