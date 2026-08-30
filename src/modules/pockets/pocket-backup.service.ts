import type { BackupData } from '../backups/backup.types.js';
import { findBackupMetadataConflict } from '../backups/backup-metadata.js';
import { savePocketBackupAsync } from '../backups/backup-persistence.service.js';
import { CongregationsList } from '../congregations/congregations.js';
import { UsersList } from '../users/users.js';

export type PocketBackupErrorCode =
	| 'INVALID_METADATA'
	| 'CONGREGATION_NOT_FOUND'
	| 'MEMBERSHIP_REQUIRED'
	| 'BACKUP_OUTDATED';

export class PocketBackupError extends Error {
	constructor(public readonly code: PocketBackupErrorCode) {
		super(code);
		this.name = 'PocketBackupError';
	}
}

export const parsePocketBackupMetadata = (metadataHeader: string): Record<string, string> => {
	try {
		const metadata: unknown = JSON.parse(metadataHeader);

		if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
			throw new PocketBackupError('INVALID_METADATA');
		}

		const entries = Object.entries(metadata);

		if (entries.some(([, value]) => typeof value !== 'string')) {
			throw new PocketBackupError('INVALID_METADATA');
		}

		return Object.fromEntries(entries) as Record<string, string>;
	} catch (error) {
		if (error instanceof PocketBackupError) throw error;
		throw new PocketBackupError('INVALID_METADATA');
	}
};

export const getPocketBackupContext = (userId: string, metadataHeader: string) => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;
	const congregation = congregationId ? CongregationsList.findById(congregationId) : undefined;

	if (!congregation) throw new PocketBackupError('CONGREGATION_NOT_FOUND');
	if (!congregation.hasMember(user.id)) throw new PocketBackupError('MEMBERSHIP_REQUIRED');

	return {
		user,
		congregation,
		metadata: parsePocketBackupMetadata(metadataHeader),
	};
};

export const submitPocketBackup = (
	userId: string,
	metadataHeader: string,
	congregationBackup: BackupData,
) => {
	const { user, congregation, metadata: incomingMetadata } = getPocketBackupContext(userId, metadataHeader);
	const currentMetadata = { ...congregation.metadata, ...user.metadata };

	if (findBackupMetadataConflict(currentMetadata, incomingMetadata)) {
		throw new PocketBackupError('BACKUP_OUTDATED');
	}

	savePocketBackupAsync({
		userId: user.id,
		userRole: user.profile.congregation!.cong_role,
		cong_backup: congregationBackup,
	});
};
