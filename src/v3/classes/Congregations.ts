import { LogLevel } from '@logtail/types';
import { CongregationCreateInfoType } from '../definition/congregation.js';
import { createCongregation, loadAllCongs } from '../services/firebase/congregations.js';
import { deleteFileFromStorage } from '../services/firebase/storage_utils.js';
import { logger } from '../services/logger/logger.js';
import { loadIncomingTalks } from '../utils/congregation_utils.js';
import { Congregation } from './Congregation.js';

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

		await loadIncomingTalks();

		this.#sort();
		return this.list;
	}

	findById(id: string) {
		return this.list.find((cong) => cong.id === id);
	}

	findByCountryAndNumber(country_code: string, cong_number: string) {
		return this.list.find((cong) => cong.settings.country_code === country_code && cong.settings.cong_number === cong_number);
	}

	findByNumber(cong_number: string) {
		return this.list.find((cong) => cong.settings.cong_number === cong_number);
	}

	async create(data: CongregationCreateInfoType) {
		const congId = await createCongregation(data);

		const cong = new Congregation(congId);
		await cong.loadDetails();

		this.list.push(cong);
		this.#sort();

		return congId;
	}

	async delete(id: string) {
		await deleteFileFromStorage({ type: 'congregation', path: id });

		this.list = this.list.filter((cong) => cong.id !== id);
	}

	findVisitingSpeakersCongregations(congId: string, name: string) {
		const keywords = name.toLowerCase();

		const congs = this.list.filter(
			(record) =>
				record.id !== congId &&
				record.settings.cong_discoverable.value &&
				record.settings.data_sync.value &&
				(record.settings.cong_name.toLowerCase().includes(keywords) ||
					record.settings.cong_number.toString().toLowerCase().includes(keywords))
		);

		const result = congs.map((cong) => {
			return {
				cong_id: cong.id,
				cong_name: cong.settings.cong_name,
				cong_number: cong.settings.cong_number,
				country_code: cong.settings.country_code,
				cong_location: cong.settings.cong_location,
				cong_circuit: cong.settings.cong_circuit.find((record) => record.type === 'main')!.value,
				midweek_meeting: cong.settings.midweek_meeting.find((record) => record.type === 'main'),
				weekend_meeting: cong.settings.weekend_meeting.find((record) => record.type === 'main'),
			};
		});

		return result;
	}

	async cleanupTasks() {
		try {
			for (const Congregation of this.list) {
				const { settings } = Congregation;

				if (!settings.group_publishers_sort) {
					continue;
				}

				if (typeof settings.group_publishers_sort === 'string') {
					continue;
				}

				const newSettings = structuredClone(Congregation.settings);
				delete newSettings.group_publishers_sort;

				await Congregation.saveSettings(newSettings);
			}
		} catch (error) {
			logger(LogLevel.Warn, `an error occured while removing invalid setting ${String(error)}`);
		}
	}
}

export const CongregationsList = new Congregations();
