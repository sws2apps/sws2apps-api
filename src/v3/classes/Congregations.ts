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

	findVisitingSpeakersCongregations(congId: string, name: string) {
		const congs = this.list.filter(
			(record) =>
				record.id !== congId &&
				record.cong_discoverable.value &&
				(record.cong_name.toLowerCase().includes(name.toLowerCase()) ||
					record.cong_number.toLowerCase().includes(name.toLowerCase()))
		);

		const result = congs.map((cong) => {
			return {
				cong_id: cong.id,
				cong_name: cong.cong_name,
				cong_number: cong.cong_number,
				country_code: cong.country_code,
				cong_location: cong.cong_location,
				cong_circuit: cong.cong_circuit.find((record) => record.type === 'main')!.value,
				midweek_meeting: cong.midweek_meeting.find((record) => record.type === 'main'),
				weekend_meeting: cong.weekend_meeting.find((record) => record.type === 'main'),
			};
		});

		return result;
	}
}

export const CongregationsList = new Congregations();
