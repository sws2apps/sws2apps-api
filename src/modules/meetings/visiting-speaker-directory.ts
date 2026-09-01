import type { Congregation } from '#modules/congregations/index.js';

export const findVisitingSpeakerCongregations = (
	congregations: Congregation[],
	currentCongregationId: string,
	name: string,
) => {
	const nameKeywords = name.toLowerCase();

	return congregations
		.filter((congregation) => {
			const isCurrentCongregation = congregation.id === currentCongregationId;
			const isDiscoverable = congregation.settings.cong_discoverable.value;
			const usesDataSync = congregation.settings.data_sync.value;
			const matchesName = congregation.settings.cong_name
				.toLowerCase()
				.includes(nameKeywords);

			return !isCurrentCongregation && isDiscoverable && usesDataSync && matchesName;
		})
		.map((congregation) => {
			return {
				cong_id: congregation.id,
				cong_name: congregation.settings.cong_name,
				country_code: congregation.settings.country_code,
				cong_location: congregation.settings.cong_location,
				cong_circuit: congregation.settings.cong_circuit.find(
					(record) => record.type === 'main',
				)!.value,
				midweek_meeting: congregation.settings.midweek_meeting.find(
					(record) => record.type === 'main',
				),
				weekend_meeting: congregation.settings.weekend_meeting.find(
					(record) => record.type === 'main',
				),
			};
		});
};
