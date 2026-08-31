import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCachedInternetCheck } from '../../src/http/middleware/internet-connection.middleware.js';

describe('cached internet connection checks', () => {
	it('reuses a result until its cache expires', async () => {
		let currentTime = 1_000;
		let checkCount = 0;
		const checkInternetConnection = async () => {
			checkCount++;
			return true;
		};
		const check = createCachedInternetCheck(
			checkInternetConnection,
			30_000,
			() => currentTime,
		);

		assert.equal(await check(), true);
		currentTime += 29_999;
		assert.equal(await check(), true);
		assert.equal(checkCount, 1);

		currentTime += 1;
		assert.equal(await check(), true);
		assert.equal(checkCount, 2);
	});

	it('shares one in-flight check between concurrent requests', async () => {
		let completeCheck!: (isConnected: boolean) => void;
		let checkCount = 0;
		const checkInternetConnection = () => {
			checkCount++;
			return new Promise<boolean>((resolve) => {
				completeCheck = resolve;
			});
		};
		const check = createCachedInternetCheck(checkInternetConnection);

		const firstRequest = check();
		const secondRequest = check();
		assert.equal(checkCount, 1);

		completeCheck(true);
		assert.deepEqual(await Promise.all([firstRequest, secondRequest]), [true, true]);
	});

	it('caches offline results as well as successful checks', async () => {
		let checkCount = 0;
		const check = createCachedInternetCheck(async () => {
			checkCount++;
			return false;
		});

		assert.equal(await check(), false);
		assert.equal(await check(), false);
		assert.equal(checkCount, 1);
	});
});
