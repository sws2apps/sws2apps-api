import { CongregationCreateInfoType } from './congregations.types.js';
import {
	createCongregation,
	loadAllCongs,
} from './congregations.repository.js';
import { initializeIncomingTalks } from './incoming-talks.service.js';
import { Congregation } from './congregation.js';
import { refreshCongregationMembers } from './congregation-members.service.js';

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
		this.list.forEach((congregation) => refreshCongregationMembers(congregation));

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
		refreshCongregationMembers(cong);

		this.list.push(cong);
		this.#sort();

		return congId;
	}

	removeById(id: string) {
		this.list = this.list.filter((cong) => cong.id !== id);
	}

}

export const CongregationsList = new Congregations();
