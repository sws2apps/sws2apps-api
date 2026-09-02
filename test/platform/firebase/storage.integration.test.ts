import assert from 'node:assert/strict';
import { test } from 'node:test';

const shouldRunFirebaseTests = process.env.RUN_FIREBASE_EMULATOR_TESTS === 'true';

const requireLocalStorageEmulator = () => {
	const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;

	assert.ok(
		emulatorHost,
		'FIREBASE_STORAGE_EMULATOR_HOST is required for Firebase integration tests',
	);
	assert.match(
		emulatorHost,
		/^(127\.0\.0\.1|localhost):\d+$/,
		'Firebase integration tests may only use a local Storage emulator',
	);
};

test(
	'storage adapter manages encrypted files through the Firebase Storage emulator',
	{ skip: !shouldRunFirebaseTests },
	async () => {
		requireLocalStorageEmulator();

		await import('#platform/firebase/firebase-app.js');

		const {
			deleteFileFromStorage,
			getFileFromStorage,
			getFileMetadata,
			listFilesFromStorage,
			uploadFileToStorage,
		} = await import('#platform/firebase/storage.js');

		const runId = `${process.pid}-${Date.now()}`;
		const directoryPath = `integration-tests/${runId}`;
		const filePath = `${directoryPath}/backup.txt`;
		const plaintext = 'Firebase Storage integration test';

		try {
			const encryptedData = await uploadFileToStorage(plaintext, {
				type: 'user',
				path: filePath,
			});

			assert.notEqual(encryptedData, plaintext);
			assert.equal(
				await getFileFromStorage({ type: 'user', path: filePath }),
				plaintext,
			);

			const metadata = await getFileMetadata({ type: 'user', path: filePath });
			assert.equal(metadata?.contentType, 'text/plain');

			const files = await listFilesFromStorage({
				type: 'user',
				path: directoryPath,
				includeContents: true,
			});

			assert.equal(files.length, 1);
			assert.equal(files[0]?.path, `v3/users/${filePath}`);
			assert.equal(files[0]?.contents, plaintext);
			assert.ok(files[0]?.updatedAt);
		} finally {
			await deleteFileFromStorage({ type: 'user', path: directoryPath });
		}
	},
);
