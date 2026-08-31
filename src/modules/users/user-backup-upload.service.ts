import {
	BackupUploadChunkError,
	discardBackupUpload,
	findBackupUploadByCongregation,
	recordBackupUploadChunk,
} from '../backups/backup-upload-tracker.js';
import { findBackupMetadataConflict } from '../backups/backup-metadata.js';
import { saveUserBackupAsync } from '../backups/backup-persistence.service.js';
import type { BackupData } from '../backups/backup.types.js';
import {
	BackupPayloadError,
	parseBackupPayload,
} from '../backups/backup-payload.js';
import {
	getUserBackupContext,
	parseUserBackupMetadata,
	UserBackupError,
} from './user-backup-context.js';

export const filterBackupMetadata = (
	metadata: Record<string, string>,
	dataSyncEnabled: boolean,
): Record<string, string> => {
	if (dataSyncEnabled) return metadata;

	const allowedMetadata = ['user_settings', 'cong_settings'];

	for (const key of Object.keys(metadata)) {
		if (!allowedMetadata.includes(key)) delete metadata[key];
	}

	return metadata;
};

export type SaveUserBackupOutcome =
	| { status: 'saved' }
	| { status: 'conflict'; key: string; currentValue: string; incomingValue: string };

export const saveUserBackup = async (
	userId: string,
	backupPayload: unknown,
): Promise<SaveUserBackupOutcome> => {
	const { user, congregation } = getUserBackupContext(userId);
	let congregationBackup: BackupData;

	try {
		congregationBackup = parseBackupPayload(backupPayload);
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
	const currentMetadata = { ...congregation.metadata, ...user.metadata };
	const metadataConflict = findBackupMetadataConflict(
		currentMetadata,
		incomingMetadata,
	);

	if (metadataConflict) {
		if (congregationBackup.app_settings?.cong_settings?.data_sync.value) {
			const settings = structuredClone(congregation.settings);
			settings.data_sync = congregationBackup.app_settings.cong_settings.data_sync;

			await congregation.saveSettings(settings);
		}

		return {
			status: 'conflict',
			key: metadataConflict.key,
			currentValue: metadataConflict.currentValue,
			incomingValue: metadataConflict.incomingValue,
		};
	}

	const userRole = user.profile.congregation!.cong_role;

	saveUserBackupAsync({
		congId: congregation.id,
		userId: user.id,
		cong_backup: congregationBackup,
		userRole,
	});

	return { status: 'saved' };
};

export type SaveUserChunkedBackupOutcome =
	| { status: 'saved' }
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
): Promise<SaveUserChunkedBackupOutcome> => {
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

	let congregationBackup: BackupData;

	try {
		congregationBackup = parseBackupPayload(completedBackup);
	} catch (error) {
		discardBackupUpload(chunk.uploadId);

		if (error instanceof BackupPayloadError) {
			throw new UserBackupError('INVALID_BACKUP');
		}

		throw error;
	}
	const userRole = user.profile.congregation!.cong_role;

	saveUserBackupAsync({
		congId: congregation.id,
		userId: user.id,
		userRole,
		cong_backup: congregationBackup,
		uploadId: chunk.uploadId,
	});

	return { status: 'saved' };
};
