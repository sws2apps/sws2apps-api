import { dbFetchCongregations } from '../utils/congregation_utils.js';
import { Congregation } from './Congregation.js';
import { CongregationCreateInfoType } from '../denifition/congregation.js';
import { dbCongregationCreate, dbCongregationDelete } from '../services/firebase/congregations.js';

class Congregations {
	list: Congregation[];

	constructor() {
		this.list = [];
	}

	#sort() {
		this.list.sort((a, b) => {
			return a.cong_name > b.cong_name ? 1 : -1;
		});
	}

	async load() {
		this.list = await dbFetchCongregations();
		this.#sort();
		return this.list;
	}

	findById(id: string) {
		return this.list.find((cong) => cong.id === id);
	}

	findByCountryAndNumber(country_code: string, cong_number: string) {
		return this.list.find((cong) => cong.country_code === country_code && cong.cong_number === cong_number);
	}

	findByNumber(cong_number: string) {
		return this.list.find((cong) => cong.cong_number === cong_number);
	}

	async create(data: CongregationCreateInfoType) {
		const congId = await dbCongregationCreate(data);

		const CongNew = new Congregation(congId);
		await CongNew.loadDetails();

		this.list.push(CongNew);
		this.#sort();

		return congId;
	}

	async delete(id: string) {
		await dbCongregationDelete(id);

		this.list = this.list.filter((cong) => cong.id !== id);
	}
}

export const CongregationsList = new Congregations();
