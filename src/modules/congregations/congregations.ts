import { CongregationCreateInfoType } from './congregations.types.js';
import {
	createCongregation,
	loadAllCongs,
} from './congregations.repository.js';
import { initializeIncomingTalks } from './incoming-talks.service.js';
import { Congregation } from './congregation.js';

class Congregations {
	list: Congregation[];

	constructor() {
		this.list = [];
	}

	#sort() {
		this.list.sort((a, b) => {
			return a.settings.cong_name > b.settings.cong_name ? 1 : -1;
		});
	}

	async load() {
		this.list = await loadAllCongs();

		await initializeIncomingTalks(this.list);

		this.#sort();
		return this.list;
	}

	findById(id: string) {
		return this.list.find((cong) => cong.id === id);
	}

	findByCountryAndName(country_guid: string, cong_name: string, country_code?: string) {
		return this.list.find((cong) => {
			const { country_code: code, country_guid: guid, cong_name: name } = cong.settings;

			const matchesCountry = (country_code && code === country_code) || code === country_guid || guid === country_guid;

			return matchesCountry && name === cong_name;
		});
	}

	findByCountryAndPrefix(country: string, cong_prefix: string) {
		return this.list.find(
			(cong) =>
				(cong.settings.country_code === country || cong.settings.country_guid === country) &&
				cong.settings.cong_prefix === cong_prefix,
		);
	}

	async create(data: CongregationCreateInfoType) {
		const congId = await createCongregation(data);

		const cong = new Congregation(congId);
		await cong.loadDetails();

		this.list.push(cong);
		this.#sort();

		return congId;
	}

	removeById(id: string) {
		this.list = this.list.filter((cong) => cong.id !== id);
	}

	findVisitingSpeakersCongregations(congId: string, name: string) {
		const keywords = name.toLowerCase();

		const congs = this.list.filter(
			(record) =>
				record.id !== congId &&
				record.settings.cong_discoverable.value &&
				record.settings.data_sync.value &&
				record.settings.cong_name.toLowerCase().includes(keywords),
		);

		const result = congs.map((cong) => {
			return {
				cong_id: cong.id,
				cong_name: cong.settings.cong_name,
				country_code: cong.settings.country_code,
				cong_location: cong.settings.cong_location,
				cong_circuit: cong.settings.cong_circuit.find((record) => record.type === 'main')!.value,
				midweek_meeting: cong.settings.midweek_meeting.find((record) => record.type === 'main'),
				weekend_meeting: cong.settings.weekend_meeting.find((record) => record.type === 'main'),
			};
		});

		return result;
	}

}

export const CongregationsList = new Congregations();
