import type { BackupForStorage } from '#modules/backups/index.js';

/** Incomplete chunked uploads held by this API process until assembly or cleanup. */
export const backupUploadsInProgress = new Map<string, BackupForStorage>();
