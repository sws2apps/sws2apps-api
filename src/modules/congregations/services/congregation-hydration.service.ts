import { Congregation } from '../congregation.js';
import {
	getCongregationDetails,
	getCongregationIds,
} from '../repositories/congregation-lifecycle.repository.js';

export const hydrateCongregation = async (congregation: Congregation): Promise<void> => {
	const data = await getCongregationDetails(congregation.id);

	congregation.createdAt = data.createdAt || '';
	congregation.metadata = data.metadata;
	congregation.outgoing_speakers = data.outgoing_speakers;
	congregation.flags = data.flags;
	congregation.join_requests = data.join_requests;
	congregation.ap_applications = data.applications;

	if (data.settings) {
		congregation.settings = data.settings;
	}

	if (data.incoming_reports) {
		congregation.incoming_reports = JSON.parse(data.incoming_reports);
	}
};

export const loadAllCongregations = async (batchSize = 10): Promise<Congregation[]> => {
	const congregationIds = await getCongregationIds();
	const congregations: Congregation[] = [];

	for (let index = 0; index < congregationIds.length; index += batchSize) {
		const batch = congregationIds.slice(index, index + batchSize);
		const hydratedBatch = await Promise.all(
			batch.map(async (congregationId) => {
				const congregation = new Congregation(congregationId);
				await hydrateCongregation(congregation);
				return congregation;
			}),
		);

		congregations.push(...hydratedBatch);
	}

	return congregations;
};
