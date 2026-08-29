import { FeatureFlag } from './feature-flag.js';
import { saveFeatureFlags } from './feature-flags.repository.js';
import { Flags } from './flags.js';

export class Flag {
	id: string;
	name: string;
	description: string;
	availability: FeatureFlag['availability'];
	status: boolean;
	coverage: number;
	installations: FeatureFlag['installations'];

	constructor(flag: FeatureFlag) {
		this.id = flag.id;
		this.availability = flag.availability;
		this.coverage = flag.coverage;
		this.description = flag.description;
		this.name = flag.name;
		this.status = flag.status;
		this.installations = [];
	}

	async update(name: string, description: string, coverage: number) {
		this.name = name;
		this.description = description;
		this.coverage = coverage;

		await saveFeatureFlags(Flags.list);
	}

	async toggle() {
		this.status = !this.status;
		await saveFeatureFlags(Flags.list);
	}
}
