import { backupUploadsInProgress } from '../../platform/runtime/backup-uploads.js';
import { BackupForStorage } from './backup.types.js';

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
