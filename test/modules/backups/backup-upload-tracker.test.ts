import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	BackupUploadChunkError,
	discardBackupUpload,
	findBackupUploadByCongregation,
	MAX_BACKUP_CHUNKS,
	recordBackupUploadChunk,
} from '#modules/backups/backup-upload-tracker.js';
import { BackupForStorage } from '#modules/backups/backup.types.js';

const createUpload = (congregationId: string): BackupForStorage => {
	const timeout = setTimeout(() => undefined, 60_000);
	timeout.unref();

	return {
		chunks: [],
		totalChunks: 2,
		received: 1,
		receivedBytes: 0,
		timeout,
		userId: 'user-1',
		congregationId,
	};
};

describe('backup upload tracker', () => {
	it('finds an in-progress upload by congregation', () => {
		const otherUpload = createUpload('congregation-1');
		const expectedUpload = createUpload('congregation-2');
		const uploads = new Map([
			['upload-1', otherUpload],
			['upload-2', expectedUpload],
		]);

		const result = findBackupUploadByCongregation('congregation-2', uploads);

		assert.deepEqual(result, {
			uploadId: 'upload-2',
			record: expectedUpload,
		});

		clearTimeout(otherUpload.timeout);
		clearTimeout(expectedUpload.timeout);
	});

	it('returns undefined when a congregation has no active upload', () => {
		const result = findBackupUploadByCongregation('congregation-1', new Map());

		assert.equal(result, undefined);
	});

	it('discards an upload and cancels its expiry timer', () => {
		const upload = createUpload('congregation-1');
		const uploads = new Map([['upload-1', upload]]);

		assert.equal(discardBackupUpload('upload-1', uploads), true);
		assert.equal(uploads.has('upload-1'), false);
		assert.equal(discardBackupUpload('upload-1', uploads), false);
	});

	it('tracks chunks and returns the assembled backup when complete', () => {
		const uploads = new Map<string, BackupForStorage>();
		const log = () => undefined;
		const commonChunkDetails = {
			uploadId: 'upload-1',
			totalChunks: 2,
			userId: 'user-1',
			congregationId: 'congregation-1',
		};

		const firstResult = recordBackupUploadChunk(
			{ ...commonChunkDetails, chunkIndex: 0, chunkData: '{"value":' },
			{ uploads, log },
		);
		const completedResult = recordBackupUploadChunk(
			{ ...commonChunkDetails, chunkIndex: 1, chunkData: 'true}' },
			{ uploads, log },
		);

		assert.equal(firstResult, undefined);
		assert.equal(completedResult, '{"value":true}');
		assert.equal(uploads.get('upload-1')?.received, 2);
		assert.equal(uploads.get('upload-1')?.receivedBytes, 14);

		clearTimeout(uploads.get('upload-1')?.timeout);
	});

	it('rejects unsafe coordinates and duplicate chunks', () => {
		const uploads = new Map<string, BackupForStorage>();
		const log = () => undefined;
		const chunk = {
			uploadId: 'upload-1',
			chunkIndex: 0,
			totalChunks: 2,
			chunkData: 'first',
			userId: 'user-1',
			congregationId: 'congregation-1',
		};

		assert.throws(
			() => recordBackupUploadChunk(
				{ ...chunk, totalChunks: MAX_BACKUP_CHUNKS + 1 },
				{ uploads, log },
			),
			BackupUploadChunkError,
		);
		assert.throws(
			() => recordBackupUploadChunk(
				{ ...chunk, chunkIndex: 2 },
				{ uploads, log },
			),
			BackupUploadChunkError,
		);

		recordBackupUploadChunk(chunk, { uploads, log });

		assert.throws(
			() => recordBackupUploadChunk(chunk, { uploads, log }),
			BackupUploadChunkError,
		);
		assert.equal(uploads.get('upload-1')?.received, 1);

		clearTimeout(uploads.get('upload-1')?.timeout);
	});

	it('rejects chunks that do not match the existing upload owner or size', () => {
		const upload = createUpload('congregation-1');
		upload.chunks = ['', ''];
		const uploads = new Map([['upload-1', upload]]);
		const baseChunk = {
			uploadId: 'upload-1',
			chunkIndex: 0,
			totalChunks: 2,
			chunkData: 'data',
			userId: 'user-1',
			congregationId: 'congregation-1',
		};

		assert.throws(
			() => recordBackupUploadChunk(
				{ ...baseChunk, userId: 'user-2' },
				{ uploads, log: () => undefined },
			),
			BackupUploadChunkError,
		);
		assert.throws(
			() => recordBackupUploadChunk(
				{ ...baseChunk, totalChunks: 3 },
				{ uploads, log: () => undefined },
			),
			BackupUploadChunkError,
		);

		clearTimeout(upload.timeout);
	});

	it('rejects chunks and uploads that exceed their byte budgets', () => {
		const uploads = new Map<string, BackupForStorage>();
		const log = () => undefined;
		const chunk = {
			uploadId: 'upload-1',
			chunkIndex: 0,
			totalChunks: 2,
			chunkData: '12345',
			userId: 'user-1',
			congregationId: 'congregation-1',
		};

		assert.throws(
			() => recordBackupUploadChunk(chunk, { uploads, log, maxChunkBytes: 4 }),
			BackupUploadChunkError,
		);

		recordBackupUploadChunk(chunk, {
			uploads,
			log,
			maxChunkBytes: 5,
			maxUploadBytes: 8,
		});

		assert.throws(
			() => recordBackupUploadChunk(
				{ ...chunk, chunkIndex: 1, chunkData: '6789' },
				{ uploads, log, maxChunkBytes: 5, maxUploadBytes: 8 },
			),
			BackupUploadChunkError,
		);
		assert.equal(uploads.get('upload-1')?.receivedBytes, 5);

		clearTimeout(uploads.get('upload-1')?.timeout);
	});

	it('limits the number of uploads retained at the same time', () => {
		const existingUpload = createUpload('congregation-1');
		const uploads = new Map([['existing-upload', existingUpload]]);

		assert.throws(
			() => recordBackupUploadChunk(
				{
					uploadId: 'new-upload',
					chunkIndex: 0,
					totalChunks: 1,
					chunkData: '{}',
					userId: 'user-2',
					congregationId: 'congregation-2',
				},
				{ uploads, log: () => undefined, maxActiveUploads: 1 },
			),
			BackupUploadChunkError,
		);

		clearTimeout(existingUpload.timeout);
	});
});
