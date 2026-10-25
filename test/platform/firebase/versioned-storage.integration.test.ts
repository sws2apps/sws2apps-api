import assert from 'node:assert/strict';
import { test } from 'node:test';

const enabled = process.env.RUN_FIREBASE_EMULATOR_TESTS === 'true';

test(
	'versioned storage round-trips encrypted contents and generation metadata',
	{ skip: !enabled },
	async () => {
		assert.match(
			process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '',
			/^(127\.0\.0\.1|localhost):\d+$/,
		);
		await import('#platform/firebase/firebase-app.js');
		const { readVersionedStorage, writeVersionedStorage } =
			await import('#platform/firebase/versioned-storage.js');
		const { deleteFileFromStorage } = await import('#platform/firebase/storage.js');
		const options = {
			type: 'congregation' as const,
			path: `integration-tests/${process.pid}-${Date.now()}/territories/main.txt`,
		};
		try {
			assert.deepEqual(await readVersionedStorage(options), { data: undefined, generation: '0' });
			assert.equal(await writeVersionedStorage(options, '0', 'first'), true);
			const snapshot = await readVersionedStorage(options);
			assert.equal(snapshot.data, 'first');
			assert.notEqual(snapshot.generation, '0');
			assert.equal(await writeVersionedStorage(options, snapshot.generation, 'second'), true);
			assert.equal((await readVersionedStorage(options)).data, 'second');
		} finally {
			await deleteFileFromStorage(options);
		}
	},
);

// firebase-tools 15.29.0 ignores GCS generation query preconditions in its Storage emulator.
// Keep the missing provider verification visible rather than claiming the emulator proves CAS.
test(
	'Cloud Storage enforces concurrent generation preconditions',
	{
		skip: 'Storage emulator ignores ifGenerationMatch; requires an isolated real GCS test bucket',
	},
	() => {},
);
