import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	IncomingTalksCongregation,
	initializeIncomingTalks,
} from '#modules/congregations/incoming-talks.service.js';
import { OutgoingTalkScheduleType } from '#modules/congregations/congregations.types.js';

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
		getPublicIncomingTalks: async () => incomingTalks,
		getPublicOutgoingTalks: async () => {
			outgoingTalkReads += 1;
			return outgoingTalks;
		},
		savePublicIncomingTalks: async (talks) => {
			savedIncomingTalks.push(talks);
		},
	};

	return {
		congregation,
		savedIncomingTalks,
		getOutgoingTalkReads: () => outgoingTalkReads,
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

		await initializeIncomingTalks([
			target.congregation,
			source.congregation,
		]);

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

		await initializeIncomingTalks([
			target.congregation,
			source.congregation,
		]);

		assert.deepEqual(target.savedIncomingTalks, []);
		assert.equal(source.getOutgoingTalkReads(), 0);
	});
});
