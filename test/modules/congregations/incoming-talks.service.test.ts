import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	IncomingTalksCongregation,
	type IncomingTalksDataAccess,
	initializeIncomingTalks,
} from '#modules/congregations/services/incoming-talks.service.js';
import { OutgoingTalkScheduleType } from '#modules/congregations/types/congregations.types.js';

const createCongregation = ({
	id,
	approvedCongregationIds = [],
	incomingTalks = [],
	outgoingTalks = [],
}: {
	id: string;
	approvedCongregationIds?: string[];
	incomingTalks?: OutgoingTalkScheduleType[];
	outgoingTalks?: OutgoingTalkScheduleType[];
}) => {
	const savedIncomingTalks: OutgoingTalkScheduleType[][] = [];
	let outgoingTalkReads = 0;

	const congregation: IncomingTalksCongregation = {
		id,
		outgoing_speakers: {
			access: approvedCongregationIds.map((congregationId) => ({
				cong_id: congregationId,
				status: 'approved',
			})),
		},
	};

	return {
		congregation,
		getIncomingTalks: async () => incomingTalks,
		getOutgoingTalks: async () => {
			outgoingTalkReads += 1;
			return outgoingTalks;
		},
		saveIncomingTalks: async (talks: OutgoingTalkScheduleType[]) => {
			savedIncomingTalks.push(talks);
		},
		savedIncomingTalks,
		getOutgoingTalkReads: () => outgoingTalkReads,
	};
};

type CongregationFixture = ReturnType<typeof createCongregation>;

const createDataAccess = (fixtures: CongregationFixture[]): IncomingTalksDataAccess => {
	const fixturesById = new Map(
		fixtures.map((fixture) => [fixture.congregation.id, fixture]),
	);

	return {
		getIncomingTalks: (congregationId) => fixturesById.get(congregationId)!.getIncomingTalks(),
		getOutgoingTalks: (congregationId) => fixturesById.get(congregationId)!.getOutgoingTalks(),
		saveIncomingTalks: (congregationId, talks) => {
			return fixturesById.get(congregationId)!.saveIncomingTalks(talks);
		},
	};
};

describe('incoming talk initialization', () => {
	it('collects talks addressed to a congregation from approved sources', async () => {
		const matchingTalk = { recipient: 'target', sender: 'source' } as OutgoingTalkScheduleType;
		const unrelatedTalk = { recipient: 'other', sender: 'source' } as OutgoingTalkScheduleType;
		const target = createCongregation({
			id: 'target',
			approvedCongregationIds: ['source', 'missing'],
		});
		const source = createCongregation({
			id: 'source',
			outgoingTalks: [matchingTalk, unrelatedTalk],
		});

		await initializeIncomingTalks(
			[target.congregation, source.congregation],
			createDataAccess([target, source]),
		);

		assert.deepEqual(target.savedIncomingTalks, [[matchingTalk]]);
		assert.equal(source.getOutgoingTalkReads(), 1);
	});

	it('leaves an existing incoming schedule untouched', async () => {
		const existingTalk = { recipient: 'target' } as OutgoingTalkScheduleType;
		const target = createCongregation({
			id: 'target',
			approvedCongregationIds: ['source'],
			incomingTalks: [existingTalk],
		});
		const source = createCongregation({ id: 'source' });

		await initializeIncomingTalks(
			[target.congregation, source.congregation],
			createDataAccess([target, source]),
		);

		assert.deepEqual(target.savedIncomingTalks, []);
		assert.equal(source.getOutgoingTalkReads(), 0);
	});
});
