import type { BackupForStorage } from '../../v3/definition/congregation.js';

/** Incomplete chunked uploads held by this API process until assembly or cleanup. */
export const backupUploadsInProgress = new Map<string, BackupForStorage>();
