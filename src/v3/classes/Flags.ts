import { FeatureFlag } from '../../modules/feature-flags/feature-flag.js';
import {
	loadFeatureFlags,
	saveFeatureFlags,
} from '../../modules/feature-flags/feature-flags.repository.js';
import { CongregationsList } from './Congregations.js';
import { Flag } from './Flag.js';
import { UsersList } from './Users.js';

class _Flags {
	list: Flag[];

	constructor() {
		this.list = [];
	}

	async load() {
		this.list = await loadFeatureFlags();
		return this.list;
	}

	findById(id: string) {
		return this.list.find((record) => record.id === id);
	}

	async create(name: string, desc: string, availability: FeatureFlag['availability']) {
		const flag = new Flag({
			id: crypto.randomUUID(),
			availability,
			coverage: 0,
			description: desc,
			name: name.toUpperCase(),
			status: false,
			installations: [],
		});

		this.list.push(flag);

		await this.save();
	}

	async delete(id: string) {
		// find and delete flag in users
		const users = UsersList.list.filter((record) => record.flags.some((flag) => flag === id));

		for await (const user of users) {
			const flags = user.flags.filter((record) => record !== id);

			const foundUser = UsersList.findById(user.id);
			await foundUser?.updateFlags(flags);
		}

		// find and delete flag in congregations
		const congs = CongregationsList.list.filter((record) => record.flags.some((flag) => flag === id));

		for await (const cong of congs) {
			const flags = cong.flags.filter((record) => record !== id);

			const foundCong = CongregationsList.findById(cong.id);
			await foundCong?.saveFlags(flags);
		}

		// delete master record
		const flags = this.list.filter((record) => record.id !== id);
		await saveFeatureFlags(flags);

		this.list = flags;
	}

	async save() {
		await saveFeatureFlags(this.list);
	}
}

export const Flags = new _Flags();
