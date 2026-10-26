import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readModifyWriteVersionedFile, type VersionedStorageOperations } from '#platform/firebase/storage.js';

const fixture = () => {
	let data = '[]'; let generation = 1;
	const operations: VersionedStorageOperations = {
		read: async () => ({ data, generation }),
		write: async (next, _options, expected) => {
			if (expected !== generation) throw Object.assign(new Error('precondition'), { code: 412 });
			data = next; generation++;
		},
	};
	return { operations, value: () => JSON.parse(data) as string[], generation: () => generation };
};
const file = { type: 'congregation' as const, path: 'test/meetings' };

it('retains competing writes to the same file', async () => {
	const store = fixture();
	await Promise.all(['first', 'second'].map((value) => readModifyWriteVersionedFile(file, async (current) => {
		const values = JSON.parse(current!) as string[]; values.push(value);
		return { data: JSON.stringify(values), result: value };
	}, store.operations)));
	assert.deepEqual(store.value(), ['first', 'second']);
	assert.equal(store.generation(), 3);
});

it('a competing scope revocation causes authorization to be re-evaluated', async () => {
	const store = fixture(); let allowed = true; let reads = 0;
	const operations = { ...store.operations, read: async () => {
		const snapshot = await store.operations.read(file); reads++;
		if (reads === 1) { allowed = false; await store.operations.write('["revocation"]', file, snapshot.generation); }
		return snapshot;
	} };
	await assert.rejects(readModifyWriteVersionedFile(file, async (current) => {
		if (reads > 1 && !allowed) throw new Error('forbidden');
		return { data: JSON.stringify([...(JSON.parse(current!) as string[]), 'edit']), result: true };
	}, operations), /forbidden/);
	assert.deepEqual(store.value(), ['revocation']);
});

it('does not retry storage failures other than generation conflicts', async () => {
	let attempts = 0;
	await assert.rejects(readModifyWriteVersionedFile(file, async () => ({ data: 'next', result: true }), {
		read: async () => ({ generation: 0 }), write: async () => { attempts++; throw new Error('unavailable'); },
	}), /unavailable/);
	assert.equal(attempts, 1);
});

it('bounds retries and never reports a rejected write as committed', async () => {
	let attempts = 0;
	await assert.rejects(readModifyWriteVersionedFile(file, async () => ({ data: 'next', result: true }), {
		read: async () => ({ generation: 0 }), write: async () => { attempts++; throw Object.assign(new Error('conflict'), { code: 412 }); },
	}), /could not be committed/);
	assert.equal(attempts, 5);
});

it('reloads the latest contents after an external generation conflict', async () => {
	const store = fixture(); let reads = 0;
	const operations = { ...store.operations, read: async () => {
		const snapshot = await store.operations.read(file); reads++;
		if (reads === 1) await store.operations.write('["external-instance"]', file, snapshot.generation);
		return snapshot;
	} };
	await readModifyWriteVersionedFile(file, async (current) => ({ data: JSON.stringify([...(JSON.parse(current!) as string[]), 'local-instance']), result: true }), operations);
	assert.deepEqual(store.value(), ['external-instance', 'local-instance']); assert.equal(reads, 2);
});
