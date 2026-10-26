import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { getStorage } from 'firebase-admin/storage';
import '#platform/firebase/firebase-app.js';
import { decryptData, encryptData } from '#platform/encryption/encryption.js';
import {
	readVersionedStorage,
	writeVersionedStorage,
} from '#platform/firebase/versioned-storage.js';

const filePrototype = Object.getPrototypeOf(getStorage().bucket().file('unused'));
const options = { type: 'congregation' as const, path: 'cong/territories/main.txt' };
afterEach(() => mock.restoreAll());

describe('versioned Storage SDK boundary', () => {
	it('sends create-only and exact generation preconditions with encrypted data', async () => {
		const calls: {
			encrypted: string;
			options: { preconditionOpts: { ifGenerationMatch: string }; resumable: boolean };
		}[] = [];
		mock.method(
			filePrototype,
			'save',
			async (encrypted: string, settings: (typeof calls)[number]['options']) => {
				calls.push({ encrypted, options: settings });
			},
		);
		await writeVersionedStorage(options, '0', 'secret');
		await writeVersionedStorage(options, '18446744073709551615', 'changed');
		assert.equal(calls[0].options.preconditionOpts.ifGenerationMatch, '0');
		assert.equal(calls[1].options.preconditionOpts.ifGenerationMatch, '18446744073709551615');
		assert.equal(calls[0].options.resumable, false);
		assert.notEqual(calls[0].encrypted, 'secret');
		assert.equal(decryptData(calls[0].encrypted), 'secret');
	});

	it('translates only provider precondition failures into conflicts', async () => {
		mock.method(filePrototype, 'save', async () => {
			throw { code: 412 };
		});
		assert.equal(await writeVersionedStorage(options, '1', 'secret'), false);
		mock.restoreAll();
		mock.method(filePrototype, 'save', async () => {
			throw new Error('unavailable');
		});
		await assert.rejects(writeVersionedStorage(options, '1', 'secret'), /unavailable/);
	});

	it('pins downloads to the metadata generation and retries a replaced generation', async () => {
		let downloads = 0;
		mock.method(filePrototype, 'getMetadata', async () => [{ generation: downloads ? '2' : '1' }]);
		mock.method(filePrototype, 'download', async function (this: { generation?: number | string }) {
			downloads += 1;
			assert.equal(String(this.generation), String(downloads));
			if (downloads === 1) throw { code: 404 };
			return [Buffer.from(encryptData('latest'))];
		});
		assert.deepEqual(await readVersionedStorage(options), { data: 'latest', generation: '2' });
	});

	it('does not turn inaccessible or corrupt storage into an empty dataset', async () => {
		mock.method(filePrototype, 'getMetadata', async () => {
			throw { code: 403 };
		});
		await assert.rejects(readVersionedStorage(options));
	});
});
