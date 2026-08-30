export class BackupMetadataError extends Error {
	constructor() {
		super('INVALID_BACKUP_METADATA');
		this.name = 'BackupMetadataError';
	}
}

export const parseBackupMetadata = (
	metadataHeader: string,
): Record<string, string> => {
	try {
		const metadata: unknown = JSON.parse(metadataHeader);

		if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
			throw new BackupMetadataError();
		}

		const entries = Object.entries(metadata);

		if (entries.some(([, value]) => typeof value !== 'string')) {
			throw new BackupMetadataError();
		}

		return Object.fromEntries(entries) as Record<string, string>;
	} catch (error) {
		if (error instanceof BackupMetadataError) throw error;
		throw new BackupMetadataError();
	}
};

export type BackupMetadataConflict = {
	key: string;
	currentValue: string;
	incomingValue: string;
};

export const findBackupMetadataConflict = (
	currentMetadata: Record<string, string>,
	incomingMetadata: Record<string, string>,
): BackupMetadataConflict | undefined => {
	for (const [key, incomingValue] of Object.entries(incomingMetadata)) {
		const currentValue = currentMetadata[key];

		if (currentValue && currentValue > incomingValue) {
			return { key, currentValue, incomingValue };
		}
	}
};
