import { CongregationsList } from './congregations.js';
import { loadAllCongs } from './congregations.repository.js';
import { initializeIncomingTalks } from './incoming-talks.service.js';
import { refreshCongregationMembers } from './congregation-members.service.js';

export const initializeCongregations = async (): Promise<void> => {
	const congregations = await loadAllCongs();

	for (const congregation of congregations) {
		refreshCongregationMembers(congregation);
	}

	await initializeIncomingTalks(congregations);
	CongregationsList.replace(congregations);
};
