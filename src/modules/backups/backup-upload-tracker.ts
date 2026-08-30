import { LogLevel } from '@logtail/types';

import { logger } from '../../platform/logging/logger.js';
import { backupUploadsInProgress } from '../../platform/runtime/backup-uploads.js';
import { BACKUP_EXPIRY } from './backup-upload-expiry.js';
import { BackupForStorage } from './backup.types.js';

type BackupUploadChunk = {
	uploadId: string;
	chunkIndex: number;
	totalChunks: number;
	chunkData: string;
	userId: string;
	congregationId: string;
};

type BackupUploadTrackerDependencies = {
	uploads?: Map<string, BackupForStorage>;
	uploadExpiry?: number;
	log?: typeof logger;
};

export const MAX_BACKUP_CHUNKS = 1_000;

export class BackupUploadChunkError extends Error {
	constructor() {
		super('INVALID_BACKUP_CHUNK');
		this.name = 'BackupUploadChunkError';
	}
}

const validateBackupUploadChunk = (
	chunk: BackupUploadChunk,
	existingUpload: BackupForStorage | undefined,
): void => {
	const coordinatesAreValid =
		Number.isInteger(chunk.chunkIndex) &&
		Number.isInteger(chunk.totalChunks) &&
		chunk.totalChunks > 0 &&
		chunk.totalChunks <= MAX_BACKUP_CHUNKS &&
		chunk.chunkIndex >= 0 &&
		chunk.chunkIndex < chunk.totalChunks &&
		chunk.chunkData.length > 0;

	if (!coordinatesAreValid) throw new BackupUploadChunkError();
	if (!existingUpload) return;

	const uploadMatches =
		existingUpload.totalChunks === chunk.totalChunks &&
		existingUpload.userId === chunk.userId &&
		existingUpload.congregationId === chunk.congregationId;
	const chunkAlreadyReceived = existingUpload.chunks[chunk.chunkIndex].length > 0;

	if (!uploadMatches || chunkAlreadyReceived) {
		throw new BackupUploadChunkError();
	}
};

export const findBackupUploadByCongregation = (
	congregationId: string,
	uploads: ReadonlyMap<string, BackupForStorage> = backupUploadsInProgress,
) => {
	for (const [uploadId, upload] of uploads.entries()) {
		if (upload.congregationId === congregationId) {
			return { uploadId, record: upload };
		}
	}

	return undefined;
};

export const recordBackupUploadChunk = (
	chunk: BackupUploadChunk,
	dependencies: BackupUploadTrackerDependencies = {},
): string | undefined => {
	const uploads = dependencies.uploads ?? backupUploadsInProgress;
	const uploadExpiry = dependencies.uploadExpiry ?? BACKUP_EXPIRY;
	const log = dependencies.log ?? logger;

	const expireUpload = () => {
		uploads.delete(chunk.uploadId);
		log(LogLevel.Warn, 'backup upload expired before all chunks were received');
	};

	let upload = uploads.get(chunk.uploadId);
	validateBackupUploadChunk(chunk, upload);

	if (!upload) {
		upload = {
			chunks: new Array<string>(chunk.totalChunks).fill(''),
			totalChunks: chunk.totalChunks,
			received: 0,
			userId: chunk.userId,
			congregationId: chunk.congregationId,
			timeout: setTimeout(expireUpload, uploadExpiry),
		};

		uploads.set(chunk.uploadId, upload);
	} else {
		clearTimeout(upload.timeout);
		upload.timeout = setTimeout(expireUpload, uploadExpiry);
	}

	upload.chunks[chunk.chunkIndex] = chunk.chunkData;
	upload.received++;

	log(
		LogLevel.Info,
		`congregation backup chunk ${chunk.chunkIndex + 1} out of ${chunk.totalChunks} received`,
	);

	if (upload.received === upload.totalChunks) {
		return upload.chunks.join('');
	}

	return undefined;
};
