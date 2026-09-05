import { LogLevel } from '@logtail/types';

import { logger } from '#platform/logging/logger.js';
import { backupUploadsInProgress } from '#platform/runtime/backup-uploads.js';
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
	maxChunkBytes?: number;
	maxUploadBytes?: number;
	maxActiveUploads?: number;
	log?: typeof logger;
};

export const MAX_BACKUP_CHUNKS = 1_000;
export const MAX_BACKUP_CHUNK_BYTES = 2_621_440;
export const MAX_BACKUP_UPLOAD_BYTES = 104_857_600;
export const MAX_ACTIVE_BACKUP_UPLOADS = 10;

export const isBackupChunkWithinByteLimit = (
	chunkData: unknown,
	maxChunkBytes = MAX_BACKUP_CHUNK_BYTES,
): chunkData is string => {
	if (typeof chunkData !== 'string' || chunkData.length === 0) return false;

	return Buffer.byteLength(chunkData, 'utf8') <= maxChunkBytes;
};

export class BackupUploadChunkError extends Error {
	constructor() {
		super('INVALID_BACKUP_CHUNK');
		this.name = 'BackupUploadChunkError';
	}
}

const validateBackupUploadChunk = (
	chunk: BackupUploadChunk,
	existingUpload: BackupForStorage | undefined,
	chunkBytes: number,
	maxChunkBytes: number,
	maxUploadBytes: number,
): void => {
	const coordinatesAreValid =
		Number.isInteger(chunk.chunkIndex) &&
		Number.isInteger(chunk.totalChunks) &&
		chunk.totalChunks > 0 &&
		chunk.totalChunks <= MAX_BACKUP_CHUNKS &&
		chunk.chunkIndex >= 0 &&
		chunk.chunkIndex < chunk.totalChunks &&
		chunkBytes > 0 &&
		chunkBytes <= maxChunkBytes;

	if (!coordinatesAreValid) throw new BackupUploadChunkError();
	if ((existingUpload?.receivedBytes ?? 0) + chunkBytes > maxUploadBytes) {
		throw new BackupUploadChunkError();
	}
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

export const discardBackupUpload = (
	uploadId: string,
	uploads: Map<string, BackupForStorage> = backupUploadsInProgress,
): boolean => {
	const upload = uploads.get(uploadId);
	if (!upload) return false;

	clearTimeout(upload.timeout);
	return uploads.delete(uploadId);
};

/**
 * Adds one validated chunk to an in-memory upload and returns the assembled
 * payload only when every chunk is present. Chunk ownership, coordinates,
 * duplication, byte limits, and concurrent-upload limits are checked before
 * the tracker is mutated.
 */
export const recordBackupUploadChunk = (
	chunk: BackupUploadChunk,
	dependencies: BackupUploadTrackerDependencies = {},
): string | undefined => {
	const uploads = dependencies.uploads ?? backupUploadsInProgress;
	const uploadExpiry = dependencies.uploadExpiry ?? BACKUP_EXPIRY;
	const maxChunkBytes = dependencies.maxChunkBytes ?? MAX_BACKUP_CHUNK_BYTES;
	const maxUploadBytes = dependencies.maxUploadBytes ?? MAX_BACKUP_UPLOAD_BYTES;
	const maxActiveUploads = dependencies.maxActiveUploads ?? MAX_ACTIVE_BACKUP_UPLOADS;
	const log = dependencies.log ?? logger;

	const expireUpload = () => {
		uploads.delete(chunk.uploadId);
		log(LogLevel.Warn, 'backup upload expired before all chunks were received');
	};

	let upload = uploads.get(chunk.uploadId);
	const chunkBytes = Buffer.byteLength(chunk.chunkData, 'utf8');
	validateBackupUploadChunk(
		chunk,
		upload,
		chunkBytes,
		maxChunkBytes,
		maxUploadBytes,
	);

	if (!upload) {
		if (uploads.size >= maxActiveUploads) throw new BackupUploadChunkError();

		upload = {
			chunks: new Array<string>(chunk.totalChunks).fill(''),
			totalChunks: chunk.totalChunks,
			received: 0,
			receivedBytes: 0,
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
	upload.receivedBytes += chunkBytes;

	log(
		LogLevel.Info,
		`congregation backup chunk ${chunk.chunkIndex + 1} out of ${chunk.totalChunks} received`,
	);

	if (upload.received === upload.totalChunks) {
		return upload.chunks.join('');
	}

	return undefined;
};
