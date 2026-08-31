import { LogLevel } from '@logtail/types';

import {
	getFileFromStorage,
	getFileMetadata,
	uploadFileToStorage,
} from '../../platform/firebase/storage.js';
import { logger } from '../../platform/logging/logger.js';
import type { CongSettingsType } from './congregations.types.js';

export const getCongregationSettings = async (cong_id: string) => {
	const data = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/settings/main.txt` });

	if (!data) {
		logger(LogLevel.Warn, 'congregation settings not found', { service: 'firebase' });
		return;
	}

	const result: CongSettingsType = JSON.parse(data!);
	return result;
};

export const getCongregationFlags = async (cong_id: string) => {
	const data = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/settings/flags.txt` });

	if (data) {
		const flags = JSON.parse(data) as string[];
		return flags;
	}

	return [];
};

export const setCongregationSettings = async (id: string, settings: CongSettingsType) => {
	const data = JSON.stringify(settings);
	const path = `${id}/settings/main.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const setCongregationFlags = async (id: string, flags: string[]) => {
	const data = JSON.stringify(flags);
	const path = `${id}/settings/flags.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

export const getCongregationCreatedAt = async (cong_id: string) => {
	let createdAt: string | undefined;

	createdAt = await getFileFromStorage({ type: 'congregation', path: `${cong_id}/settings/created.txt` });

	if (!createdAt) {
		const createdAtDefault = await getFileMetadata({ type: 'congregation', path: `${cong_id}/settings/main.txt` });
		createdAt = createdAtDefault?.timeCreated || new Date().toISOString();

		await setCongregationCreatedAt(cong_id, createdAt!);
	}

	return createdAt;
};

export const setCongregationCreatedAt = async (id: string, data: string) => {
	const path = `${id}/settings/created.txt`;
	await uploadFileToStorage(data, { type: 'congregation', path });
};

