import {
	findBackupUploadByCongregation,
	recordBackupUploadChunk,
} from '../backups/backup-upload-tracker.js';
import { findBackupMetadataConflict } from '../backups/backup-metadata.js';
import { saveUserBackupAsync } from '../backups/backup-persistence.service.js';
import type { BackupData } from '../backups/backup.types.js';
import { getUserBackupContext } from './users-backup.service.js';

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
	congregationBackup: BackupData,
): Promise<SaveUserBackupOutcome> => {
	const { user, congregation } = getUserBackupContext(userId);
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
		JSON.parse(metadataHeader) as Record<string, string>,
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
	const completedBackup = recordBackupUploadChunk({
		uploadId,
		chunkIndex,
		totalChunks,
		chunkData,
		userId: user.id,
		congregationId: congregation.id,
	});

	if (!completedBackup) return { status: 'chunk_received' };

	const congregationBackup = JSON.parse(completedBackup) as BackupData;
	const userRole = user.profile.congregation!.cong_role;

	saveUserBackupAsync({
		congId: congregation.id,
		userId: user.id,
		userRole,
		cong_backup: congregationBackup,
	});

	return { status: 'saved' };
};
