import { Congregation } from '../congregation.js';
import {
	getCongregationDetails,
	getCongregationIds,
} from '../repositories/congregation-lifecycle.repository.js';

export type CongregationHydrationDataSource = {
	getIds: typeof getCongregationIds;
	getDetails: typeof getCongregationDetails;
};

const defaultDataSource: CongregationHydrationDataSource = {
	getIds: getCongregationIds,
	getDetails: getCongregationDetails,
};

export const hydrateCongregation = async (
	congregation: Congregation,
	dataSource: CongregationHydrationDataSource = defaultDataSource,
): Promise<void> => {
	const data = await dataSource.getDetails(congregation.id);

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

export const loadAllCongregations = async (
	batchSize = 10,
	dataSource: CongregationHydrationDataSource = defaultDataSource,
): Promise<Congregation[]> => {
	const congregationIds = await dataSource.getIds();
	const congregations: Congregation[] = [];

	for (let index = 0; index < congregationIds.length; index += batchSize) {
		const batch = congregationIds.slice(index, index + batchSize);
		const hydratedBatch = await Promise.all(
			batch.map(async (congregationId) => {
				const congregation = new Congregation(congregationId);
				await hydrateCongregation(congregation, dataSource);
				return congregation;
			}),
		);

		congregations.push(...hydratedBatch);
	}

	return congregations;
};
