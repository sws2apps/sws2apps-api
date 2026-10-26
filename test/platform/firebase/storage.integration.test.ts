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

test('generation-checked meeting writes retain concurrent updates in the Storage emulator', { skip: !shouldRunFirebaseTests }, async () => {
	requireLocalStorageEmulator();
	await import('#platform/firebase/firebase-app.js');
	const { readModifyWriteVersionedFile, getFileFromStorage, deleteFileFromStorage } = await import('#platform/firebase/storage.js');
	const directory = `integration-tests/cas-${process.pid}-${Date.now()}`;
	const options = { type: 'congregation' as const, path: `${directory}/meetings.txt` };
	try {
		await Promise.all(['a', 'b'].map((id) => readModifyWriteVersionedFile(options, async (current) => {
			const values = current ? JSON.parse(current) as string[] : [];
			values.push(id);
			return { data: JSON.stringify(values), result: id };
		})));
		assert.deepEqual((JSON.parse((await getFileFromStorage(options))!) as string[]).sort(), ['a', 'b']);
	} finally {
		await deleteFileFromStorage({ type: 'congregation', path: directory });
	}
});

test('meeting backup services enforce real stored ownership while sharing meetings with readers', { skip: !shouldRunFirebaseTests }, async () => {
	requireLocalStorageEmulator();
	await import('#platform/firebase/firebase-app.js');
	const { UsersList } = await import('#modules/users/index.js');
	const { User } = await import('#modules/users/user.js');
	const { CongregationsList } = await import('#modules/congregations/index.js');
	const { Congregation } = await import('#modules/congregations/congregation.js');
	const { saveUserBackup, saveUserChunkedBackup } = await import('#modules/users/services/user-backup-upload.service.js');
	const { retrieveUserBackup } = await import('#modules/users/services/users-backup.service.js');
	const { FieldServiceWriteError, getFieldServiceMeetings } = await import('#modules/field-service-meetings/index.js');
	const { deleteFileFromStorage } = await import('#platform/firebase/storage.js');
	const previousUsers = UsersList.list; const previousCongregations = CongregationsList.list;
	const id = `integration-meetings-${process.pid}-${Date.now()}`;
	const congregation = new Congregation(id); congregation.settings.data_sync.value = true;
	const user = new User(id);
	user.profile.congregation = { id, account_type: 'vip', user_local_uid: 'lead', cong_role: ['admin'] };
	congregation.members = [user]; UsersList.list = [user]; CongregationsList.list = [congregation];
	const meeting = (uid: string, group: string) => ({ meeting_uid: uid, meeting_data: 'client-encrypted-content', authorization: { group_id: group, category: 0 as const, conductor: `conductor-${group}`, deleted: false, updatedAt: '2026-10-26T08:00:00.000Z' } });
	const forbidden = (error: unknown) => error instanceof FieldServiceWriteError && error.code === 'FORBIDDEN';
	try {
		const created = await saveUserBackup(user.id, { metadata: {}, field_service_scheduling: { base_revision: '', groups: [
			{ group_id: 'own', manager_uids: ['lead'], conductor_uids: ['conductor-own'] },
			{ group_id: 'other', manager_uids: ['other-lead'], conductor_uids: ['conductor-other'] },
		] }, field_service_meetings: [meeting('own', 'own'), meeting('other', 'other')] });
		assert.equal(created.status, 'saved');
		if (created.status !== 'saved') throw new Error('Expected persisted backup');
		assert.equal(created.field_service_meeting_receipts?.length, 2);

		user.profile.congregation.cong_role = ['publisher'];
		const metadata = JSON.stringify({ ...congregation.metadata, ...user.metadata, field_service_meetings: '' });
		const visible = await retrieveUserBackup(user.id, metadata);
		assert.equal(visible.field_service_meetings?.length, 2);
		assert.equal(visible.app_settings.cong_settings?.cong_master_key, undefined);
		await assert.rejects(saveUserBackup(user.id, { metadata: {}, field_service_meetings: [meeting('forbidden', 'own')] }), forbidden);

		user.profile.congregation.cong_role = ['group_overseers'];
		const records = await getFieldServiceMeetings(id);
		const own = structuredClone(records.find((record) => record.meeting_uid === 'own')!);
		own.authorization.updatedAt = '2026-10-26T09:00:00.000Z';
		const chunk = JSON.stringify({ field_service_meetings: [own] });
		const edited = await saveUserChunkedBackup(user.id, '{}', { uploadId: `${id}-upload`, chunkIndex: 0, totalChunks: 1, chunkData: chunk });
		assert.equal(edited.status, 'saved');
		const forged = structuredClone(records.find((record) => record.meeting_uid === 'other')!);
		forged.authorization = { ...own.authorization, deleted: true };
		await assert.rejects(saveUserBackup(user.id, { metadata: {}, field_service_meetings: [forged] }), forbidden);
		await assert.rejects(saveUserBackup(user.id, { metadata: {}, field_service_scheduling: { base_revision: congregation.metadata.field_service_scheduling, groups: [] } }), forbidden);
		const persisted = await getFieldServiceMeetings(id);
		assert.equal(persisted.length, 2);
		assert.equal(persisted.find((record) => record.meeting_uid === 'other')?.authorization.group_id, 'other');
		assert.equal(persisted.find((record) => record.meeting_uid === 'other')?.authorization.deleted, false);
	} finally {
		UsersList.list = previousUsers; CongregationsList.list = previousCongregations;
		await deleteFileFromStorage({ type: 'congregation', path: id });
	}
});
