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
