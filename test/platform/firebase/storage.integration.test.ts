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

test(
	'name fields and encrypted print settings survive repository storage round trips',
	{ skip: !shouldRunFirebaseTests },
	async () => {
		requireLocalStorageEmulator();
		await import('#platform/firebase/firebase-app.js');
		const { deleteFileFromStorage } = await import('#platform/firebase/storage.js');
		const { getUserProfile, setUserProfile } = await import('#modules/users/repositories/user-account.repository.js');
		const { getCongregationSettings, setCongregationSettings } = await import('#modules/congregations/repositories/congregation-settings.repository.js');
		const { User } = await import('#modules/users/user.js');
		const { Congregation } = await import('#modules/congregations/congregation.js');
		const id = `integration-tests/names-${process.pid}-${Date.now()}`;
		try {
			const { profile } = new User(id);
			for (const value of ['María Jean', '']) {
				profile.middlename = { value, updatedAt: new Date().toISOString() };
				await setUserProfile(id, profile);
				assert.deepEqual((await getUserProfile(id)).middlename, profile.middlename);
			}
			const { settings } = new Congregation(id);
			settings.print_fullname_option = 'client-encrypted-context-records';
			await setCongregationSettings(id, settings);
			assert.equal((await getCongregationSettings(id))?.print_fullname_option, settings.print_fullname_option);
		} finally {
			await deleteFileFromStorage({ type: 'user', path: id });
			await deleteFileFromStorage({ type: 'congregation', path: id });
		}
	},
);

test('Pocket account creation persists optional middle names', { skip: !shouldRunFirebaseTests }, async () => {
	requireLocalStorageEmulator();
	await import('#platform/firebase/firebase-app.js');
	const { createPersistedPocketUser } = await import('#modules/users/repositories/user-lifecycle.repository.js');
	const { getUserProfile } = await import('#modules/users/repositories/user-account.repository.js');
	const { deleteFileFromStorage } = await import('#platform/firebase/storage.js');
	for (const user_middlename of [undefined, 'María Jean', '']) {
		const id = await createPersistedPocketUser({
			user_firstname: 'Ada', user_lastname: 'Lovelace', user_middlename,
			user_secret_code: 'test-only-code', cong_id: 'integration-tests', cong_person_uid: 'person-1', cong_role: ['publisher'],
		});
		try {
			const profile = await getUserProfile(id);
			assert.equal(profile.middlename?.value, user_middlename);
			if (user_middlename !== undefined) assert.ok(profile.middlename?.updatedAt);
		} finally {
			await deleteFileFromStorage({ type: 'user', path: id });
		}
	}
});
