import {
	BackupMetadataError,
	parseBackupMetadata,
} from '../backups/backup-metadata.js';
import type { Congregation } from '../congregations/congregation.js';
import { CongregationsList } from '../congregations/congregations.js';
import type { User } from './user.js';
import { UsersList } from './users.js';

export type UserBackupErrorCode =
	| 'CONGREGATION_NOT_ASSIGNED'
	| 'CONGREGATION_NOT_FOUND'
	| 'INVALID_METADATA';

export class UserBackupError extends Error {
	constructor(public readonly code: UserBackupErrorCode) {
		super(code);
		this.name = 'UserBackupError';
	}
}

export const getUserBackupContext = (userId: string): {
	user: User;
	congregation: Congregation;
} => {
	const user = UsersList.findById(userId)!;
	const congregationId = user.profile.congregation?.id;

	if (!congregationId) throw new UserBackupError('CONGREGATION_NOT_ASSIGNED');

	const congregation = CongregationsList.findById(congregationId);
	if (!congregation) throw new UserBackupError('CONGREGATION_NOT_FOUND');

	return { user, congregation };
};

export const parseUserBackupMetadata = (
	metadataHeader: string,
): Record<string, string> => {
	try {
		return parseBackupMetadata(metadataHeader);
	} catch (error) {
		if (error instanceof BackupMetadataError) {
			throw new UserBackupError('INVALID_METADATA');
		}

		throw error;
	}
};
