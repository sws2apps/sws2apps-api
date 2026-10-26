import type {
	TerritoryCampaignProgress,
	TerritoryRecord,
} from '../territory.types.js';

const addTerritory = (view: TerritoryCampaignProgress, record: TerritoryRecord): void => {
	view.total += 1;
	const covered = new Set(
		record.history
			.filter((item) => item.campaignId && item.returnedAt && item.completed !== false)
			.map((item) => item.campaignId!),
	);
	const open = record.assignment?.campaignId;
	const campaigns = new Set(covered);
	if (open) campaigns.add(open);
	for (const campaignId of campaigns) {
		let counts = view.campaigns.find((item) => item.campaignId === campaignId);
		if (!counts) {
			counts = { campaignId, worked: 0, out: 0 };
			view.campaigns.push(counts);
		}
		if (covered.has(campaignId)) counts.worked += 1;
		else counts.out += 1;
	}
};

/** Aggregate before record projection, but never cross the actor's authorized data views. */
export const campaignProgress = (
	records: TerritoryRecord[],
	dataViews?: string[],
): TerritoryCampaignProgress[] => {
	const views = new Map<string, TerritoryCampaignProgress>();
	// Include empty authorized views so zero is distinct from unavailable progress.
	for (const dataView of dataViews ?? [])
		views.set(dataView, { dataView, total: 0, campaigns: [] });
	for (const record of records) {
		if (record.deleted || (dataViews && !views.has(record.dataView))) continue;
		let view = views.get(record.dataView);
		if (!view) {
			view = { dataView: record.dataView, total: 0, campaigns: [] };
			views.set(record.dataView, view);
		}
		addTerritory(view, record);
	}
	return [...views.values()];
};
