import assert from 'node:assert/strict';
import { test } from 'node:test';

const shouldRunFirebaseTests = process.env.RUN_FIREBASE_EMULATOR_TESTS === 'true';

const requireLocalAuthenticationEmulator = () => {
	const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

	assert.ok(
		emulatorHost,
		'FIREBASE_AUTH_EMULATOR_HOST is required for Firebase integration tests',
	);
	assert.match(
		emulatorHost,
		/^(127\.0\.0\.1|localhost):\d+$/,
		'Firebase integration tests may only use a local Authentication emulator',
	);
};

test(
	'authentication adapter manages users through the Firebase Auth emulator',
	{ skip: !shouldRunFirebaseTests },
	async () => {
		requireLocalAuthenticationEmulator();

		await import('#platform/firebase/firebase-app.js');

		const {
			createFirebaseAuthenticationUser,
			deleteFirebaseAuthUser,
			findFirebaseAuthenticationUserIdByEmail,
			getFirebaseUserDetails,
			getFirebaseUserDisplayName,
			importFirebaseAuthenticationUserIfMissing,
			updateFirebaseUserEmail,
		} = await import('#platform/firebase/authentication.js');

		const runId = `${process.pid}-${Date.now()}`;
		const originalEmail = `adapter-${runId}@example.com`;
		const updatedEmail = `updated-${runId}@example.com`;
		const importedUserId = `imported-${runId}`;
		const createdUserId = await createFirebaseAuthenticationUser(originalEmail);

		try {
			await updateFirebaseUserEmail(createdUserId, updatedEmail);

			const foundUserId = await findFirebaseAuthenticationUserIdByEmail(updatedEmail);
			const userDetails = await getFirebaseUserDetails(createdUserId);

			assert.equal(foundUserId, createdUserId);
			assert.equal(userDetails?.email, updatedEmail);
			assert.equal(userDetails?.auth_provider, 'email');
			assert.ok(userDetails?.createdAt);

			const imported = await importFirebaseAuthenticationUserIfMissing({
				uid: importedUserId,
				email: `imported-${runId}@example.com`,
				displayName: 'Imported test user',
			});
			const importedAgain = await importFirebaseAuthenticationUserIfMissing({
				uid: importedUserId,
				email: `imported-${runId}@example.com`,
				displayName: 'Imported test user',
			});

			assert.equal(imported, true);
			assert.equal(importedAgain, false);
			assert.equal(
				await getFirebaseUserDisplayName(importedUserId),
				'Imported test user',
			);
		} finally {
			await Promise.all([
				deleteFirebaseAuthUser(createdUserId),
				deleteFirebaseAuthUser(importedUserId),
			]);
		}
	},
);
