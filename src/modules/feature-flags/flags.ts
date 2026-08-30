import { loadFeatureFlags } from './feature-flags.repository.js';
import { Flag } from './flag.js';

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

}

export const Flags = new _Flags();
