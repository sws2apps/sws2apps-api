import type { BackupData } from './backup.types.js';

export class BackupPayloadError extends Error {
	constructor() {
		super('INVALID_BACKUP_PAYLOAD');
		this.name = 'BackupPayloadError';
	}
}

const isStringRecord = (value: unknown): value is Record<string, string> => {
	if (!value || Array.isArray(value) || typeof value !== 'object') return false;

	return Object.values(value).every((entry) => typeof entry === 'string');
};

export const parseBackupPayload = (payload: unknown): BackupData => {
	try {
		const parsedPayload: unknown = typeof payload === 'string'
			? JSON.parse(payload)
			: payload;

		if (
			!parsedPayload ||
			Array.isArray(parsedPayload) ||
			typeof parsedPayload !== 'object'
		) {
			throw new BackupPayloadError();
		}

		const backup = parsedPayload as Partial<BackupData>;

		if (!isStringRecord(backup.metadata)) {
			throw new BackupPayloadError();
		}

		if (
			backup.app_settings !== undefined &&
			(!backup.app_settings ||
				Array.isArray(backup.app_settings) ||
				typeof backup.app_settings !== 'object')
		) {
			throw new BackupPayloadError();
		}

		return parsedPayload as BackupData;
	} catch (error) {
		if (error instanceof BackupPayloadError) throw error;
		throw new BackupPayloadError();
	}
};
