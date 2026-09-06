import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	buildStoragePath,
	readModifyWriteFile,
} from '#platform/firebase/storage.js';

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

describe('serialized read-modify-write', () => {
	const createSharedStore = () => {
		const contents = new Map<string, string>();
		return {
			read: (path: string) => async () => contents.get(path),
			write: (path: string) => async (next: string) => {
				contents.set(path, next);
				return next;
			},
			contents,
		};
	};

	it('serializes concurrent appends to the same file without losing updates', async () => {
		const { read, write, contents } = createSharedStore();
		const options = { type: 'api' as const, path: 'flags.txt' };

		const seen: string[] = [];
		let releaseGate!: () => void;
		const gate = new Promise<void>((resolve) => (releaseGate = resolve));

		const first = readModifyWriteFile(
			options,
			async (current) => {
				seen.push(`${current ?? ''}|A`);
				return { data: (current ?? '') + 'A', result: 1 };
			},
			{
				read: read('v3/api/flags.txt'),
				write: async (next) => {
					await gate;
					return write('v3/api/flags.txt')(next);
				},
			},
		);

		const second = readModifyWriteFile(
			options,
			async (current) => {
				seen.push(`${current ?? ''}|B`);
				return { data: (current ?? '') + 'B', result: 2 };
			},
			{ read: read('v3/api/flags.txt'), write: write('v3/api/flags.txt') },
		);

		releaseGate();
		const [a, b] = await Promise.all([first, second]);

		assert.equal(a, 1);
		assert.equal(b, 2);
		assert.equal(contents.get('v3/api/flags.txt'), 'AB');
		assert.deepEqual(seen, ['|A', 'A|B']);
	});

	it('does not serialize writes to different file paths', async () => {
		const { read, write } = createSharedStore();
		let releaseBoth!: () => void;
		const gate = new Promise<void>((resolve) => (releaseBoth = resolve));
		let started = 0;
		const signalStart = () => {
			started += 1;
		};

		const a = readModifyWriteFile(
			{ type: 'api', path: 'a.txt' },
			async (current) => {
				signalStart();
				await gate;
				return { data: (current ?? '') + 'a', result: 'a' };
			},
			{ read: read('v3/api/a.txt'), write: write('v3/api/a.txt') },
		);
		const b = readModifyWriteFile(
			{ type: 'api', path: 'b.txt' },
			async (current) => {
				signalStart();
				await gate;
				return { data: (current ?? '') + 'b', result: 'b' };
			},
			{ read: read('v3/api/b.txt'), write: write('v3/api/b.txt') },
		);

		await new Promise<void>((resolve) => setImmediate(resolve));
		releaseBoth();

		assert.deepEqual(await Promise.all([a, b]), ['a', 'b']);
		assert.equal(started, 2);
	});

	it('releases the queue slot when the modifier throws', async () => {
		const { read, write } = createSharedStore();

		await assert.rejects(
			readModifyWriteFile(
				{ type: 'api', path: 'flags.txt' },
				async () => {
					throw new Error('boom');
				},
				{ read: read('v3/api/flags.txt'), write: write('v3/api/flags.txt') },
			),
			/boom/,
		);

		const after = await readModifyWriteFile(
			{ type: 'api', path: 'flags.txt' },
			async () => ({ data: 'ok', result: 'done' }),
			{ read: read('v3/api/flags.txt'), write: write('v3/api/flags.txt') },
		);
		assert.equal(after, 'done');
	});
});
