import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

const enabled = process.env.RUN_GCS_INTEGRATION_TESTS === 'true';
const requireDedicatedBucket = () => {
	const bucket = process.env.GCS_TEST_BUCKET;
	assert.ok(bucket, 'Set GCS_TEST_BUCKET to an isolated test bucket');
	assert.equal(
		process.env.FIREBASE_STORAGE_BUCKET,
		bucket,
		'Explicitly select the isolated bucket with FIREBASE_STORAGE_BUCKET',
	);
	assert.ok(process.env.FIREBASE_APP_NAME, 'Set FIREBASE_APP_NAME to the test project');
	for (const name of [
		'STORAGE_EMULATOR_HOST',
		'FIREBASE_STORAGE_EMULATOR_HOST',
		'FIREBASE_AUTH_EMULATOR_HOST',
		'FIRESTORE_EMULATOR_HOST',
	])
		assert.ok(!process.env[name], 'Real-GCS checks cannot run against an emulator');
	return bucket;
};

const cleanObjectVersions = async (bucketName: string, path: string) => {
	const { getStorage } = await import('firebase-admin/storage');
	const [versions] = await getStorage()
		.bucket(bucketName)
		.getFiles({ prefix: path, versions: true });
	await Promise.all(
		versions
			.filter((version) => version.name === path)
			.map((version) => version.delete({ ignoreNotFound: true })),
	);
};

const race = async <T>(actions: Promise<T>[]) => {
	const results = await Promise.allSettled(actions);
	for (const result of results)
		assert.equal(result.status, 'fulfilled', 'A provider request failed unexpectedly');
	return results.map((result) => (result as PromiseFulfilledResult<T>).value);
};

test(
	'real GCS permits one conditional writer and rejects stale generations',
	{ skip: !enabled, timeout: 120000 },
	async () => {
		const bucketName = requireDedicatedBucket();
		await import('#platform/firebase/firebase-app.js');
		const { getStorage } = await import('firebase-admin/storage');
		const { readVersionedStorage, writeVersionedStorage } =
			await import('#platform/firebase/versioned-storage.js');
		const { buildStoragePath } = await import('#platform/firebase/storage.js');
		const options = {
			type: 'congregation' as const,
			path: `integration-tests/${randomUUID()}/territories/main.txt`,
		};
		const file = getStorage().bucket(bucketName).file(buildStoragePath(options));
		try {
			assert.deepEqual(await readVersionedStorage(options), { data: undefined, generation: '0' });
			const created = await race(
				Array.from({ length: 6 }, (_, index) =>
					writeVersionedStorage(options, '0', `create-${index}`),
				),
			);
			assert.equal(
				created.filter(Boolean).length,
				1,
				'Exactly one create must win across concurrent clients',
			);
			const first = await readVersionedStorage(options);
			assert.equal(first.data, `create-${created.indexOf(true)}`);
			assert.match(first.generation, /^[1-9]\d*$/);
			const updated = await race(
				Array.from({ length: 6 }, (_, index) =>
					writeVersionedStorage(options, first.generation, `update-${index}`),
				),
			);
			assert.equal(
				updated.filter(Boolean).length,
				1,
				'Exactly one update must match the shared generation',
			);
			const latest = await readVersionedStorage(options);
			assert.notEqual(latest.generation, first.generation);
			assert.equal(latest.data, `update-${updated.indexOf(true)}`);
			assert.equal(await writeVersionedStorage(options, first.generation, 'stale'), false);
			assert.deepEqual(await readVersionedStorage(options), latest);
			const [raw] = await file.download();
			assert.notEqual(raw.toString(), latest.data, 'The provider must store encrypted contents');
		} finally {
			await cleanObjectVersions(bucketName, file.name);
		}
	},
);

test(
	'real GCS rejects a competing territory assignment across independent snapshots',
	{ skip: !enabled, timeout: 120000 },
	async () => {
		const bucketName = requireDedicatedBucket();
		await import('#platform/firebase/firebase-app.js');
		const { getStorage } = await import('firebase-admin/storage');
		const { readTerritories, writeTerritories } =
			await import('#modules/territories/repositories/territory.repository.js');
		const { executeTerritoryCommand, updateTerritoryPolicy } =
			await import('#modules/territories/services/territory.service.js');
		const congregationId = `integration-test-${randomUUID()}`;
		const file = getStorage()
			.bucket(bucketName)
			.file(`v3/congregations/${congregationId}/territories/main.txt`);
		const actor = { congregationId, userId: 'test-manager', roles: ['elder' as const] };
		const operations = {
			read: readTerritories,
			write: writeTerritories,
			getEvents: async () => [],
			getGroups: async () => [],
			getPersons: async () => [{ person_uid: 'test-a' }, { person_uid: 'test-b' }],
			now: () => new Date().toISOString(),
		};
		const grant = (personId: string) => ({
			personId,
			eligible: true,
			access: 'request' as const,
			groupIds: [],
			dataViews: ['main'],
			restrictedCategories: [],
			restrictedTypes: [],
		});
		try {
			await updateTerritoryPolicy(
				actor,
				{
					revision: 0,
					grants: [grant('test-a'), grant('test-b')],
					content: 'client-encrypted-policy',
				},
				operations,
			);
			await executeTerritoryCommand(
				actor,
				'test-territory',
				{
					action: 'update',
					expectedRevision: 0,
					details: {
						dataView: 'main',
						type: 'door_to_door',
						categories: [],
						cardLost: false,
						content: 'client-encrypted-map',
						privateContent: 'client-encrypted-private',
					},
				},
				operations,
			);
			const snapshot = await readTerritories(congregationId);
			let readers = 0;
			let release!: () => void;
			const ready = new Promise<void>((resolve) => {
				release = resolve;
			});
			const concurrent = {
				...operations,
				read: async () => {
					readers++;
					if (readers === 2) release();
					await ready;
					return structuredClone(snapshot);
				},
			};
			const results = await Promise.allSettled(
				['test-a', 'test-b'].map((personId) =>
					executeTerritoryCommand(
						actor,
						'test-territory',
						{ action: 'assign', personId, expectedRevision: 1 },
						concurrent,
					),
				),
			);
			assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
			const rejected = results.find(
				(result) => result.status === 'rejected',
			) as PromiseRejectedResult;
			assert.equal(rejected.reason.code, 'TERRITORY_CONFLICT');
			const latest = await readTerritories(congregationId);
			assert.equal(latest.state.records[0].revision, 2);
			assert.ok(['test-a', 'test-b'].includes(latest.state.records[0].assignment!.personId));
		} finally {
			await cleanObjectVersions(bucketName, file.name);
		}
	},
);
