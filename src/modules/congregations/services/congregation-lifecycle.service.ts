import { LogLevel } from '@logtail/types';
import { logger } from '#platform/logging/logger.js';
import { CongregationsList } from '../congregations.js';
import { deletePersistedCongregation } from '../repositories/congregation-lifecycle.repository.js';
import { saveCongregationSettings } from './congregation-data.service.js';
import type { Congregation } from '../congregation.js';

export type CongregationLifecycleOperations = {
	deletePersistedCongregation: typeof deletePersistedCongregation;
	removeCongregationById: (congregationId: string) => void;
	getCongregations: () => readonly Congregation[];
	saveSettings: typeof saveCongregationSettings;
	log: typeof logger;
};

const defaultLifecycleOperations: CongregationLifecycleOperations = {
	deletePersistedCongregation: (congregationId) => {
		return deletePersistedCongregation(congregationId);
	},
	removeCongregationById: (congregationId) => {
		CongregationsList.removeById(congregationId);
	},
	getCongregations: () => CongregationsList.list,
	saveSettings: (congregation, settings) => {
		return saveCongregationSettings(congregation, settings);
	},
	log: logger,
};

const resolveLifecycleOperations = (
	overrides: Partial<CongregationLifecycleOperations>,
): CongregationLifecycleOperations => ({
	...defaultLifecycleOperations,
	...overrides,
});

export const deleteCongregation = async (
	congregationId: string,
	operations: Partial<CongregationLifecycleOperations> = {},
): Promise<void> => {
	const lifecycle = resolveLifecycleOperations(operations);
	await lifecycle.deletePersistedCongregation(congregationId);

	lifecycle.removeCongregationById(congregationId);
};

export const cleanUpLegacyCongregationSettings = async (
	operations: Partial<CongregationLifecycleOperations> = {},
): Promise<void> => {
	const lifecycle = resolveLifecycleOperations(operations);

	try {
		for (const congregation of lifecycle.getCongregations()) {
			const legacyPublisherSort = congregation.settings.group_publishers_sort;

			if (!legacyPublisherSort || typeof legacyPublisherSort === 'string') {
				continue;
			}

			const updatedSettings = structuredClone(congregation.settings);
			delete updatedSettings.group_publishers_sort;

			await lifecycle.saveSettings(congregation, updatedSettings);
		}
	} catch {
		lifecycle.log(LogLevel.Warn, 'invalid congregation setting cleanup failed');
	}
};
