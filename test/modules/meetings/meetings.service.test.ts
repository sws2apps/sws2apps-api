import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { Congregation } from '#modules/congregations/congregation.js';
import { CongregationsList } from '#modules/congregations/congregations.js';
import type { OutgoingTalkScheduleType } from '#modules/congregations/index.js';
import {
	approveVisitingSpeakerAccess,
	getMeetingSchedules,
	MeetingAccessError,
	publishMeetingSchedules,
	rejectVisitingSpeakerAccess,
	requestVisitingSpeakerAccess,
} from '#modules/meetings/meetings.service.js';
import { User } from '#modules/users/user.js';
import { UsersList } from '#modules/users/users.js';

describe('meeting congregation access', () => {
	let originalCongregations: Congregation[];
	let originalUsers: User[];

	beforeEach(() => {
		originalCongregations = CongregationsList.list;
		originalUsers = UsersList.list;
		CongregationsList.list = [];
		UsersList.list = [];
	});

	afterEach(() => {
		CongregationsList.list = originalCongregations;
		UsersList.list = originalUsers;
	});

	it('returns a stable error when the congregation does not exist', async () => {
		await assert.rejects(
			getMeetingSchedules('missing-congregation', 'user-1'),
			(error: unknown) =>
				error instanceof MeetingAccessError && error.code === 'CONGREGATION_NOT_FOUND',
		);
	});

	it('requires the requesting user to belong to the congregation', async () => {
		const congregation = new Congregation('congregation-1');
		CongregationsList.list = [congregation];

		await assert.rejects(
			getMeetingSchedules(congregation.id, 'unassigned-user'),
			(error: unknown) =>
				error instanceof MeetingAccessError && error.code === 'MEMBERSHIP_REQUIRED',
		);
	});

	it('retrieves public sources and schedules for an authorized member', async () => {
		const { congregation, user } = createAuthorizedMeetingContext();
		const requestedCongregationIds: string[] = [];

		const result = await getMeetingSchedules(congregation.id, user.id, {
			getSources: async (congregationId) => {
				requestedCongregationIds.push(congregationId);
				return [{ id: 'source-1' }];
			},
			getSchedules: async (congregationId) => {
				requestedCongregationIds.push(congregationId);
				return [{ id: 'schedule-1' }];
			},
		});

		assert.deepEqual(result, {
			sources: [{ id: 'source-1' }],
			schedules: [{ id: 'schedule-1' }],
		});
		assert.deepEqual(requestedCongregationIds, [congregation.id, congregation.id]);
	});
});

const createAuthorizedMeetingContext = () => {
	const congregation = new Congregation('congregation-1');
	const user = new User('user-1');
	user.profile.congregation = {
		id: congregation.id,
		cong_role: ['midweek_schedule'],
		account_type: 'vip',
	};
	CongregationsList.list = [congregation];
	UsersList.list = [user];

	return { congregation, user };
};

describe('meeting schedule publication', () => {
	let originalCongregations: Congregation[];
	let originalUsers: User[];

	beforeEach(() => {
		originalCongregations = CongregationsList.list;
		originalUsers = UsersList.list;
		CongregationsList.list = [];
		UsersList.list = [];
	});

	afterEach(() => {
		CongregationsList.list = originalCongregations;
		UsersList.list = originalUsers;
	});

	it('persists serialized schedules before copying outgoing talks', async () => {
		const { congregation, user } = createAuthorizedMeetingContext();
		const completedOperations: string[] = [];
		const talk: OutgoingTalkScheduleType = {
			_deleted: false,
			updatedAt: '2026-09-02T10:00:00.000Z',
			id: 'talk-1',
			recipient: 'congregation-2',
			sender: congregation.id,
			weekOf: '2026/09/07',
			synced: false,
			opening_song: '1',
			public_talk: 1,
			speaker: 'Speaker',
			congregation: {
				name: 'Central',
				number: '1',
				country: 'Madagascar',
				address: 'Example address',
				weekday: 6,
				time: '10:00',
			},
		};

		await publishMeetingSchedules(
			{
				congregationId: congregation.id,
				userId: user.id,
				sources: [{ id: 'source-1' }],
				schedules: [{ id: 'schedule-1' }],
				talks: [talk],
			},
			{
				savePublication: async (target, publication) => {
					assert.equal(target, congregation);
					assert.equal(publication.serializedSources, '[{"id":"source-1"}]');
					assert.equal(publication.serializedSchedules, '[{"id":"schedule-1"}]');
					completedOperations.push('publication');
				},
				copyTalkSchedule: async (target, congregations, talks) => {
					assert.equal(target, congregation);
					assert.equal(congregations, CongregationsList.list);
					assert.deepEqual(talks, [talk]);
					completedOperations.push('talks');
				},
			},
		);

		assert.deepEqual(completedOperations, ['publication', 'talks']);
	});

	it('does not copy talks when publication persistence fails', async () => {
		const { congregation, user } = createAuthorizedMeetingContext();
		let copiedTalks = false;

		await assert.rejects(
			publishMeetingSchedules(
				{
					congregationId: congregation.id,
					userId: user.id,
					sources: [],
					schedules: [],
					talks: [],
				},
				{
					savePublication: async () => {
						throw new Error('persistence unavailable');
					},
					copyTalkSchedule: async () => {
						copiedTalks = true;
					},
				},
			),
			/persistence unavailable/,
		);
		assert.equal(copiedTalks, false);
	});
});

describe('visiting-speaker access workflow', () => {
	let originalCongregations: Congregation[];
	let originalUsers: User[];

	beforeEach(() => {
		originalCongregations = CongregationsList.list;
		originalUsers = UsersList.list;
		CongregationsList.list = [];
		UsersList.list = [];
	});

	afterEach(() => {
		CongregationsList.list = originalCongregations;
		UsersList.list = originalUsers;
	});

	it('passes an access request to the selected target congregation', async () => {
		const { congregation, user } = createAuthorizedMeetingContext();
		const targetCongregation = new Congregation('congregation-2');
		CongregationsList.list.push(targetCongregation);
		let requestedTargetId: string | undefined;

		await requestVisitingSpeakerAccess(
			congregation.id,
			user.id,
			targetCongregation.id,
			'temporary-key',
			'request-1',
			{
				requestSpeakerAccess: async (requester, target, key, requestId) => {
					assert.equal(requester, congregation);
					assert.equal(key, 'temporary-key');
					assert.equal(requestId, 'request-1');
					requestedTargetId = target.id;
				},
			},
		);

		assert.equal(requestedTargetId, targetCongregation.id);
	});

	it('approves and rejects pending access requests', async () => {
		const { congregation, user } = createAuthorizedMeetingContext();
		const requestingCongregation = new Congregation('congregation-2');
		requestingCongregation.settings.cong_name = 'North';
		requestingCongregation.settings.country_code = 'MG';
		CongregationsList.list.push(requestingCongregation);
		congregation.outgoing_speakers.access = [{
			cong_id: requestingCongregation.id,
			status: 'pending',
			updatedAt: '2026-09-02T10:00:00.000Z',
			temp_key: 'temporary-key',
			request_id: 'request-1',
		}];
		let approvedKey: string | undefined;

		const afterApproval = await approveVisitingSpeakerAccess(
			congregation.id,
			user.id,
			'request-1',
			'speakers-key',
			{
				approveSpeakerAccess: async (target, requestId, key) => {
					approvedKey = key;
					target.outgoing_speakers.access.find(
						(request) => request.request_id === requestId,
					)!.status = 'approved';
				},
			},
		);

		assert.equal(approvedKey, 'speakers-key');
		assert.deepEqual(afterApproval, []);

		congregation.outgoing_speakers.access[0]!.status = 'pending';
		const afterRejection = await rejectVisitingSpeakerAccess(
			congregation.id,
			user.id,
			'request-1',
			{
				rejectSpeakerAccess: async (target, requestId) => {
					target.outgoing_speakers.access.find(
						(request) => request.request_id === requestId,
					)!.status = 'disapproved';
				},
			},
		);

		assert.deepEqual(afterRejection, []);
	});
});
