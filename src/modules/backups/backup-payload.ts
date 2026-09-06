import { APP_ROLES, type AppRoleType } from '#domain/users/app-role.js';
import type { CongSettingsType } from '#modules/congregations/index.js';

import type { BackupData } from './backup.types.js';

export class BackupPayloadError extends Error {
	constructor() {
		super('INVALID_BACKUP_PAYLOAD');
		this.name = 'BackupPayloadError';
	}
}

const MAX_DATASET_ENTRIES = 100_000;
const MAX_PAYLOAD_DEPTH = 64;

const isStringRecord = (value: unknown): value is Record<string, string> => {
	if (!value || Array.isArray(value) || typeof value !== 'object') return false;

	return Object.values(value).every((entry) => typeof entry === 'string');
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	return !!value && !Array.isArray(value) && typeof value === 'object';
};

const isRecordArray = (value: unknown): value is Record<string, unknown>[] => {
	return Array.isArray(value) && value.every(isPlainObject);
};

const isStringArray = (value: unknown): value is string[] => {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
};

const isKnownRole = (role: unknown): boolean => {
	return typeof role === 'string' && APP_ROLES.includes(role as AppRoleType);
};

const isCongUserEntry = (entry: unknown): boolean => {
	if (!isPlainObject(entry)) return false;
	if (typeof entry.id !== 'string' || entry.id.length === 0) return false;
	if (entry.local_uid !== undefined && typeof entry.local_uid !== 'string') return false;
	if (entry.role === undefined) return true;
	return isStringArray(entry.role) && entry.role.every(isKnownRole);
};

const hasValidCongUsers = (backup: Record<string, unknown>): boolean => {
	if (backup.cong_users === undefined) return true;
	return (
		Array.isArray(backup.cong_users) &&
		backup.cong_users.length <= MAX_DATASET_ENTRIES &&
		backup.cong_users.every(isCongUserEntry)
	);
};

const CONG_SETTINGS_KEYS: readonly (keyof CongSettingsType)[] = [
	'country_code',
	'country_guid',
	'cong_guid',
	'cong_prefix',
	'cong_number',
	'cong_name',
	'cong_master_key',
	'cong_access_code',
	'cong_location',
	'cong_new',
	'cong_circuit',
	'cong_discoverable',
	'data_sync',
	'fullname_option',
	'short_date_format',
	'display_name_enabled',
	'schedule_exact_date_enabled',
	'time_away_public',
	'source_material_auto_import',
	'special_months',
	'midweek_meeting',
	'weekend_meeting',
	'circuit_overseer',
	'language_groups',
	'format_24h_enabled',
	'week_start_sunday',
	'attendance_online_record',
	'responsabilities',
	'last_backup',
	'group_publishers_sort',
	'first_day_of_the_week',
];

const CONG_SETTINGS_KEY_SET = new Set<string>(CONG_SETTINGS_KEYS);

const hasOnlyKnownCongSettingsKeys = (settings: Record<string, unknown>): boolean => {
	return Object.keys(settings).every((key) => CONG_SETTINGS_KEY_SET.has(key));
};

const hasValidAppSettings = (backup: Record<string, unknown>): boolean => {
	if (backup.app_settings === undefined) return true;

	const settings = backup.app_settings;
	if (!isPlainObject(settings)) return false;
	if (settings.cong_settings !== undefined) {
		if (!isPlainObject(settings.cong_settings)) return false;
		if (!hasOnlyKnownCongSettingsKeys(settings.cong_settings)) return false;
	}
	return settings.user_settings === undefined || isPlainObject(settings.user_settings);
};

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

const hasValidRecordDatasets = (backup: Record<string, unknown>): boolean => {
	return recordDatasetFields.every((field) => {
		const dataset = backup[field];
		if (dataset === undefined) return true;
		if (!isRecordArray(dataset)) return false;
		return dataset.length <= MAX_DATASET_ENTRIES;
	});
};

const hasValidOutgoingTalks = (backup: Record<string, unknown>): boolean => {
	const talks = backup.outgoing_talks;
	if (talks === undefined) return true;
	if (!isRecordArray(talks)) return false;
	return talks.length <= MAX_DATASET_ENTRIES;
};

const isWithinDepthLimit = (value: unknown, limit: number, currentDepth = 0): boolean => {
	if (currentDepth > limit) return false;
	if (!value || typeof value !== 'object') return true;
	return Object.values(value).every((entry) =>
		isWithinDepthLimit(entry, limit, currentDepth + 1),
	);
};

/**
 * Rejects backup payloads whose defined fields do not match the documented
 * backup schema. Record datasets must be arrays of objects, `app_settings`
 * containers and their nested settings must be objects, congregation settings
 * may contain only the keys of the documented settings schema, identifiers
 * must be non-empty strings, and congregation role lists must contain only
 * known application roles. Payloads must stay within the configured nesting
 * depth and per-dataset entry bounds.
 */
const isBackupPayload = (value: unknown): value is Record<string, unknown> => {
	if (!value || Array.isArray(value) || typeof value !== 'object') return false;

	const backup = value as Record<string, unknown>;
	if (!isWithinDepthLimit(value, MAX_PAYLOAD_DEPTH)) return false;

	if (!isStringRecord(backup.metadata)) return false;
	if (!hasValidAppSettings(backup)) return false;
	if (backup.speakers_key !== undefined && typeof backup.speakers_key !== 'string') return false;
	if (!hasValidOutgoingTalks(backup)) return false;
	if (!hasValidRecordDatasets(backup)) return false;

	return hasValidCongUsers(backup);
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