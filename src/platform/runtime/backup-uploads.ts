import type { BackupForStorage } from '../../modules/backups/backup.types.js';

/** Incomplete chunked uploads held by this API process until assembly or cleanup. */
export const backupUploadsInProgress = new Map<string, BackupForStorage>();
