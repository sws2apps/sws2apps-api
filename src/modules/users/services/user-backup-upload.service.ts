import { getUserCapabilities } from '#domain/users/user-capabilities.js';
import {
	saveFieldServiceMeetings,
	getFieldServiceMeetingReceipts,
	type FieldServiceMeetingReceipt,
} from '#modules/field-service-meetings/index.js';
import {
	BackupUploadChunkError,
	discardBackupUpload,
	findBackupUploadByCongregation,
	recordBackupUploadChunk,
	findBackupMetadataConflict,
	saveUserBackupAsync,
	type BackupData,
	type BackupDataWithOptionalMetadata,
	BackupPayloadError,
	parseBackupPayload,
} from '#modules/backups/index.js';
import {
	getUserBackupContext,
	parseUserBackupMetadata,
	UserBackupError,
} from '../user-backup-context.js';
import { saveCongregationSettings } from '#modules/congregations/index.js';

export type UserBackupUploadOperations = {
	saveBackup: typeof saveUserBackupAsync;
	saveMeetings: typeof saveFieldServiceMeetings;
};

const defaultUploadOperations: UserBackupUploadOperations = {
	saveBackup: (input) => saveUserBackupAsync(input),
	saveMeetings: saveFieldServiceMeetings,
};

/** Meeting writes finish before HTTP success, after ordinary backup persistence. */
const saveSchedulingData = async (
	userId: string,
	backup: BackupDataWithOptionalMetadata,
	saveMeetings: typeof saveFieldServiceMeetings,
): Promise<FieldServiceMeetingReceipt[]> => {
	if (!backup.field_service_meetings?.length && !backup.field_service_scheduling) return [];
	const { congregation } = getUserBackupContext(userId);
	if (!congregation.settings.data_sync.value) throw new UserBackupError('INVALID_BACKUP');
	const document = await saveMeetings(
		congregation.id,
		() => {
			const { user, congregation: currentCongregation } = getUserBackupContext(userId);
			if (!currentCongregation.settings.data_sync.value) throw new UserBackupError('INVALID_BACKUP');
			return {
				congregationId: currentCongregation.id,
				personUid: user.profile.congregation?.user_local_uid,
				roles: user.profile.congregation!.cong_role,
			};
		},
		backup.field_service_meetings,
		backup.field_service_scheduling,
	);
	const receipts = getFieldServiceMeetingReceipts(document, backup.field_service_meetings);
	congregation.metadata.field_service_meetings = document.meetings_revision;
	congregation.metadata.field_service_scheduling = document.scope_revision;
	return receipts;
};

export const filterBackupMetadata = (
	metadata: Record<string, string>,
	dataSyncEnabled: boolean,
): Record<string, string> => {
	if (dataSyncEnabled) return metadata;

	const allowedMetadata = new Set(['user_settings', 'cong_settings']);

	return Object.fromEntries(
		Object.entries(metadata).filter(([key]) => allowedMetadata.has(key)),
	);
};

export type SaveUserBackupOutcome =
	| { status: 'saved'; field_service_meeting_receipts?: FieldServiceMeetingReceipt[] }
	| { status: 'conflict'; key: string; currentValue: string; incomingValue: string };

export const saveUserBackup = async (
	userId: string,
	backupPayload: unknown,
	operations: Partial<UserBackupUploadOperations> = {},
): Promise<SaveUserBackupOutcome> => {
	const upload = { ...defaultUploadOperations, ...operations };
	const { user, congregation } = getUserBackupContext(userId);
	let congregationBackup: BackupData;

	try {
		congregationBackup = parseBackupPayload(backupPayload, { requireMetadata: true });
	} catch (error) {
		if (error instanceof BackupPayloadError) {
			throw new UserBackupError('INVALID_BACKUP');
		}

		throw error;
	}

	const incomingMetadata = filterBackupMetadata(
		congregationBackup.metadata,
		congregation.settings.data_sync.value,
	);
	congregationBackup.metadata = incomingMetadata;
	const currentMetadata = { ...congregation.metadata, ...user.metadata };
	const metadataConflict = findBackupMetadataConflict(
		currentMetadata,
		incomingMetadata,
	);

	if (metadataConflict) {
		if (getUserCapabilities(user.profile.congregation!.cong_role).adminRole && congregationBackup.app_settings?.cong_settings?.data_sync?.value) {
			const settings = structuredClone(congregation.settings);
			settings.data_sync = congregationBackup.app_settings.cong_settings.data_sync;

			await saveCongregationSettings(congregation, settings);
		}

		return {
			status: 'conflict',
			key: metadataConflict.key,
			currentValue: metadataConflict.currentValue,
			incomingValue: metadataConflict.incomingValue,
		};
	}

	const userRole = user.profile.congregation!.cong_role;

	const persisted = await upload.saveBackup({
		congId: congregation.id,
		userId: user.id,
		cong_backup: congregationBackup,
		userRole,
	});

	if (persisted.status === 'failed') throw new Error('Backup persistence failed');
	const receipts = await saveSchedulingData(user.id, congregationBackup, upload.saveMeetings);
	return { status: 'saved', field_service_meeting_receipts: receipts };
};

export type SaveUserChunkedBackupOutcome =
	| { status: 'saved'; field_service_meeting_receipts?: FieldServiceMeetingReceipt[] }
	| { status: 'chunk_received' }
	| { status: 'metadata_conflict'; key: string; currentValue: string; incomingValue: string }
	| { status: 'backup_in_progress' };

type SaveUserChunkedBackupChunk = {
	uploadId: string;
	chunkIndex: number;
	totalChunks: number;
	chunkData: string;
};

export const saveUserChunkedBackup = async (
	userId: string,
	metadataHeader: string,
	chunk: SaveUserChunkedBackupChunk,
	operations: Partial<UserBackupUploadOperations> = {},
): Promise<SaveUserChunkedBackupOutcome> => {
	const upload = { ...defaultUploadOperations, ...operations };
	const { user, congregation } = getUserBackupContext(userId);
	const incomingMetadata = filterBackupMetadata(
		parseUserBackupMetadata(metadataHeader),
		congregation.settings.data_sync.value,
	);
	const currentMetadata = { ...congregation.metadata, ...user.metadata };
	const metadataConflict = findBackupMetadataConflict(
		currentMetadata,
		incomingMetadata,
	);

	if (metadataConflict) {
		return {
			status: 'metadata_conflict',
			key: metadataConflict.key,
			currentValue: metadataConflict.currentValue,
			incomingValue: metadataConflict.incomingValue,
		};
	}

	const currentBackup = findBackupUploadByCongregation(congregation.id);

	if (currentBackup) {
		const anotherUser = currentBackup.record.userId !== user.id;
		const anotherDevice =
			currentBackup.record.userId === user.id &&
			currentBackup.uploadId !== chunk.uploadId;

		if (anotherUser || anotherDevice) {
			return { status: 'backup_in_progress' };
		}
	}

	const { uploadId, chunkIndex, totalChunks, chunkData } = chunk;
	let completedBackup: string | undefined;

	try {
		completedBackup = recordBackupUploadChunk({
			uploadId,
			chunkIndex,
			totalChunks,
			chunkData,
			userId: user.id,
			congregationId: congregation.id,
		});
	} catch (error) {
		if (error instanceof BackupUploadChunkError) {
			throw new UserBackupError('INVALID_CHUNK');
		}

		throw error;
	}

	if (!completedBackup) return { status: 'chunk_received' };

	let congregationBackup: BackupDataWithOptionalMetadata;

	try {
		congregationBackup = parseBackupPayload(completedBackup, { requireMetadata: false });
	} catch (error) {
		discardBackupUpload(chunk.uploadId);

		if (error instanceof BackupPayloadError) {
			throw new UserBackupError('INVALID_BACKUP');
		}

		throw error;
	}
	const userRole = user.profile.congregation!.cong_role;

	const persisted = await upload.saveBackup({
		congId: congregation.id,
		userId: user.id,
		userRole,
		cong_backup: congregationBackup,
		uploadId: chunk.uploadId,
	});

	if (persisted.status === 'failed') throw new Error('Backup persistence failed');
	const receipts = await saveSchedulingData(user.id, congregationBackup, upload.saveMeetings);
	return { status: 'saved', field_service_meeting_receipts: receipts };
};
