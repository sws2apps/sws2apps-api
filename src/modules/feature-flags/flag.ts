import { FeatureFlag } from './feature-flag.js';

type LegacyFeatureFlag = FeatureFlag & {
	installations: { id: string; registered?: string; last_handshake?: string }[];
};

const normalizeInstallationRecord = (
	record: LegacyFeatureFlag['installations'][number],
): FeatureFlag['installations'][number] => ({
	id: record.id,
	last_handshake: record.last_handshake ?? record.registered,
});

export class Flag {
	id: string;
	name: string;
	description: string;
	availability: FeatureFlag['availability'];
	status: boolean;
	coverage: number;
	installations: FeatureFlag['installations'];

	constructor(flag: FeatureFlag | LegacyFeatureFlag) {
		this.id = flag.id;
		this.availability = flag.availability;
		this.coverage = flag.coverage;
		this.description = flag.description;
		this.name = flag.name;
		this.status = flag.status;
		this.installations = structuredClone(flag.installations ?? []).map(normalizeInstallationRecord);
	}

}
