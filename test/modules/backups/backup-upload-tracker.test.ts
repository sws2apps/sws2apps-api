import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	findBackupUploadByCongregation,
	recordBackupUploadChunk,
} from '../../../src/modules/backups/backup-upload-tracker.js';
import { BackupForStorage } from '../../../src/modules/backups/backup.types.js';

const createUpload = (congregationId: string): BackupForStorage => {
	const timeout = setTimeout(() => undefined, 60_000);
	timeout.unref();

	return {
		chunks: [],
		totalChunks: 2,
		received: 1,
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

		clearTimeout(uploads.get('upload-1')?.timeout);
	});
});
