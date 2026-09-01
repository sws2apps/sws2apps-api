import { CongregationsList } from '../congregations.js';
import { loadAllCongregations } from './congregation-hydration.service.js';
import { initializeIncomingTalks } from './incoming-talks.service.js';
import { refreshCongregationMembers } from './congregation-members.service.js';

export const initializeCongregations = async (): Promise<void> => {
	const congregations = await loadAllCongregations();

	for (const congregation of congregations) {
		refreshCongregationMembers(congregation);
	}

	await initializeIncomingTalks(congregations);
	CongregationsList.replace(congregations);
};
