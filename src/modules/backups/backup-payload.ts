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

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	return !!value && !Array.isArray(value) && typeof value === 'object';
};

const isRecordArray = (value: unknown): boolean => {
	return Array.isArray(value) && value.every(isPlainObject);
};

const isStringArray = (value: unknown): boolean => {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
};

/**
 * Rejects backup payloads whose defined fields do not match the documented
 * backup schema. Record datasets must be arrays of objects, `app_settings`
 * containers and their nested settings must be objects, identifiers must be
 * non-empty strings, and congregation role lists must be string arrays.
 * Undocumented top-level and settings fields remain valid because the public
 * contract allows additional properties.
 */
const isBackupPayload = (value: unknown): value is Record<string, unknown> => {
	if (!value || Array.isArray(value) || typeof value !== 'object') return false;

	const backup = value as Record<string, unknown>;

	if (!isStringRecord(backup.metadata)) return false;

	if (backup.app_settings !== undefined) {
		const settings = backup.app_settings;

		if (!isPlainObject(settings)) return false;
		if (settings.cong_settings !== undefined && !isPlainObject(settings.cong_settings)) return false;
		if (settings.user_settings !== undefined && !isPlainObject(settings.user_settings)) return false;
	}

	if (backup.speakers_key !== undefined && typeof backup.speakers_key !== 'string') return false;

	if (backup.outgoing_talks !== undefined && !isRecordArray(backup.outgoing_talks)) return false;

	const recordDatasetFields = [
		'persons',
		'outgoing_speakers',
		'speakers_congregations',
		'visiting_speakers',
		'branch_cong_analysis',
		'branch_field_service_reports',
		'field_service_groups',
		'meeting_attendance',
		'sched',
		'sources',
		'upcoming_events',
		'user_bible_studies',
		'user_field_service_reports',
		'delegated_field_service_reports',
		'public_schedules',
		'public_sources',
		'incoming_reports',
		'cong_field_service_reports',
	] as const;

	if (recordDatasetFields.some((field) => {
		return backup[field] !== undefined && !isRecordArray(backup[field]);
	})) {
		return false;
	}

	if (backup.cong_users !== undefined) {
		if (!Array.isArray(backup.cong_users)) return false;

		if (backup.cong_users.some((entry) => {
			if (!isPlainObject(entry)) return true;
			if (typeof entry.id !== 'string' || entry.id.length === 0) return true;
			if (entry.local_uid !== undefined && typeof entry.local_uid !== 'string') return true;
			return entry.role !== undefined && !isStringArray(entry.role);
		})) {
			return false;
		}
	}

	return true;
};

/**
 * Parses an uploaded backup payload and enforces the backup schema before any
 * conflict check or persistence runs. Malformed known fields are rejected so
 * they can never replace congregation or user records in storage.
 */
export const parseBackupPayload = (payload: unknown): BackupData => {
	try {
		const parsedPayload: unknown = typeof payload === 'string'
			? JSON.parse(payload)
			: payload;

		if (!isBackupPayload(parsedPayload)) {
			throw new BackupPayloadError();
		}

		return parsedPayload as BackupData;
	} catch (error) {
		if (error instanceof BackupPayloadError) throw error;
		throw new BackupPayloadError();
	}
};