import { CongregationsList } from '../congregations.js';
import { loadAllCongregations } from './congregation-hydration.service.js';
import { initializeIncomingTalks } from './incoming-talks.service.js';
import { refreshCongregationMembers } from './congregation-members.service.js';
import type { Congregation } from '../congregation.js';

export type CongregationInitializationOperations = {
	loadCongregations: () => Promise<Congregation[]>;
	refreshMembers: typeof refreshCongregationMembers;
	initializeIncomingTalks: typeof initializeIncomingTalks;
	replaceCongregations: (congregations: Congregation[]) => void;
};

const defaultInitializationOperations: CongregationInitializationOperations = {
	loadCongregations: () => loadAllCongregations(),
	refreshMembers: (congregation) => refreshCongregationMembers(congregation),
	initializeIncomingTalks: (congregations) => initializeIncomingTalks(congregations),
	replaceCongregations: (congregations) => CongregationsList.replace(congregations),
};

export const initializeCongregations = async (
	operations: Partial<CongregationInitializationOperations> = {},
): Promise<void> => {
	const initialization = {
		...defaultInitializationOperations,
		...operations,
	};
	const congregations = await initialization.loadCongregations();

	for (const congregation of congregations) {
		initialization.refreshMembers(congregation);
	}

	await initialization.initializeIncomingTalks(congregations);
	initialization.replaceCongregations(congregations);
};
