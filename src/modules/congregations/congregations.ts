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

	add(congregation: Congregation) {
		this.list.push(congregation);
		this.#sort();
	}

	replace(congregations: Congregation[]) {
		this.list = congregations;
		this.#sort();
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

	removeById(id: string) {
		this.list = this.list.filter((cong) => cong.id !== id);
	}

}

export const CongregationsList = new Congregations();
