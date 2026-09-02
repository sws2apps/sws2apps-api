import assert from 'node:assert/strict';
import { test } from 'node:test';

const shouldRunFirebaseTests = process.env.RUN_FIREBASE_EMULATOR_TESTS === 'true';

const requireLocalFirestoreEmulator = () => {
	const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

	assert.ok(
		emulatorHost,
		'FIRESTORE_EMULATOR_HOST is required for Firebase integration tests',
	);
	assert.match(
		emulatorHost,
		/^(127\.0\.0\.1|localhost):\d+$/,
		'Firebase integration tests may only use a local Firestore emulator',
	);
};

test(
	'document-store reads and updates records through the Firestore emulator',
	{ skip: !shouldRunFirebaseTests },
	async () => {
		requireLocalFirestoreEmulator();

		await import('#platform/firebase/firebase-app.js');

		const { getFirestore } = await import('firebase-admin/firestore');
		const {
			addCollectionRecord,
			getCollectionRecords,
			getFirstCollectionRecord,
			updateCollectionRecord,
		} = await import('#platform/firebase/document-store.js');

		const collectionName = `document-store-test-${process.pid}-${Date.now()}`;
		const database = getFirestore();

		try {
			await addCollectionRecord(collectionName, {
				name: 'Initial name',
				status: 'pending',
			});

			const records = await getCollectionRecords(collectionName);
			const [storedRecord] = records;

			assert.equal(records.length, 1);
			assert.ok(storedRecord);
			assert.deepEqual(storedRecord.data, {
				name: 'Initial name',
				status: 'pending',
			});

			const firstRecord = await getFirstCollectionRecord(collectionName);
			assert.equal(firstRecord?.id, storedRecord.id);

			await updateCollectionRecord(collectionName, storedRecord.id, {
				status: 'complete',
			});

			const updatedRecord = await getFirstCollectionRecord(collectionName);
			assert.deepEqual(updatedRecord?.data, {
				name: 'Initial name',
				status: 'complete',
			});
		} finally {
			const testRecords = await database.collection(collectionName).get();
			await Promise.all(testRecords.docs.map((record) => record.ref.delete()));
		}
	},
);
