import { Flag } from './flag.js';

class _Flags {
	list: Flag[];

	constructor() {
		this.list = [];
	}

	replace(flags: Flag[]) {
		this.list = flags;
	}

	findById(id: string) {
		return this.list.find((record) => record.id === id);
	}

}

export const Flags = new _Flags();
