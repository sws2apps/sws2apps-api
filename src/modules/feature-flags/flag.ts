import { FeatureFlag } from './feature-flag.js';

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
		this.installations = structuredClone(flag.installations ?? []);
	}

}
