import { LogLevel } from '@logtail/types';
import { deleteFileFromStorage } from '../../platform/firebase/storage.js';
import { logger } from '../../platform/logging/logger.js';
import { CongregationsList } from './congregations.js';

export const deleteCongregation = async (congregationId: string): Promise<void> => {
	await deleteFileFromStorage({
		type: 'congregation',
		path: congregationId,
	});

	CongregationsList.removeById(congregationId);
};

export const cleanUpLegacyCongregationSettings = async (): Promise<void> => {
	try {
		for (const congregation of CongregationsList.list) {
			const legacyPublisherSort = congregation.settings.group_publishers_sort;

			if (!legacyPublisherSort || typeof legacyPublisherSort === 'string') {
				continue;
			}

			const updatedSettings = structuredClone(congregation.settings);
			delete updatedSettings.group_publishers_sort;

			await congregation.saveSettings(updatedSettings);
		}
	} catch {
		logger(LogLevel.Warn, 'invalid congregation setting cleanup failed');
	}
};
