import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyPartnerMutation } from '#modules/preaching-partner/partner.policy.js';
import type { PartnerMutation, PartnerRequest, PartnerState } from '#modules/preaching-partner/partner.types.js';

const now = '2030-01-01T12:00:00.000Z';
const request = (id = 'one', owner = 'owner'): PartnerRequest => ({ request_uid: id, request_data: { person_uid: owner, date: '2030/01/02', flexible: true, type: 0, comment: ' hello ', updatedAt: now, _deleted: false } });
const state = (requests: PartnerRequest[] = []): PartnerState => ({ requests, receipts: [] });
const mutation = (action: PartnerMutation['action'], record = request()): PartnerMutation => ({ operationId: 'operation', action, request: record });

test('create derives ownership from authenticated actor and ignores injected arrangement fields', () => {
	const input = request(); input.request_data.partner_uid = 'injected';
	const result = applyPartnerMutation(state(), mutation('create', input), 'actor', now);
	assert.equal(result.changes[0].request_data.person_uid, 'actor');
	assert.equal(result.changes[0].request_data.partner_uid, undefined);
	assert.equal(result.changes[0].request_data.comment, 'hello');
});
test('concurrent joins and stale edits reject without mutating the original state', () => {
	const initial = state([request()]);
	const joined = applyPartnerMutation(initial, mutation('join'), 'partner', now);
	assert.throws(() => applyPartnerMutation(joined.state, { ...mutation('join'), operationId: 'second' }, 'other', now), /PARTNER_CONFLICT/);
	assert.throws(() => applyPartnerMutation(joined.state, { ...mutation('edit'), operationId: 'third' }, 'owner', now), /PARTNER_CONFLICT/);
	assert.equal(initial.requests[0].request_data.partner_uid, undefined);
});
test('operation retries return the original result and reject changed payloads', () => {
	const first = applyPartnerMutation(state([request()]), mutation('join'), 'partner', now);
	assert.deepEqual(applyPartnerMutation(first.state, mutation('join'), 'partner', now).changes, first.changes);
	assert.throws(() => applyPartnerMutation(first.state, { ...mutation('join'), withdrawRequestIds: ['other'] }, 'partner', now), /PARTNER_CONFLICT/);
});
test('only owners edit or delete; only participants cancel; owners cannot join themselves', () => {
	for (const action of ['edit', 'delete', 'cancel'] as const) assert.throws(() => applyPartnerMutation(state([request()]), mutation(action), 'other', now), /PARTNER_CONFLICT/);
	assert.throws(() => applyPartnerMutation(state([request()]), mutation('join'), 'owner', now), /PARTNER_CONFLICT/);
	const joined = applyPartnerMutation(state([request()]), mutation('join'), 'partner', now);
	for (const actor of ['owner', 'partner']) {
		const cancelled = applyPartnerMutation(joined.state, { ...mutation('cancel', joined.changes[0]), operationId: 'cancel' }, actor, now);
		assert.equal(cancelled.changes[0].request_data.partner_uid, undefined);
	}
});
test('explicit withdrawals are limited to the joining publisher’s open requests on the same date', () => {
	const own = request('own', 'partner'); const other = request('other');
	const result = applyPartnerMutation(state([request(), own, other]), { ...mutation('join'), withdrawRequestIds: ['own', 'other'] }, 'partner', now);
	assert.equal(result.changes.length, 2);
	assert.equal(result.state.requests.find(r => r.request_uid === 'own')?.request_data._deleted, true);
	assert.equal(result.state.requests.find(r => r.request_uid === 'other')?.request_data._deleted, false);
});
test('calendar dates and time ranges are validated and flexible edits remove obsolete times', () => {
	for (const date of ['2030/02/30', '2020/01/01', '2030-01-02']) {
		const record = request(); record.request_data.date = date;
		assert.throws(() => applyPartnerMutation(state(), mutation('create', record), 'owner', now), /PARTNER_INVALID/);
	}
	const record = request(); Object.assign(record.request_data, { flexible: false, start: '15:00', end: '14:00' });
	assert.throws(() => applyPartnerMutation(state(), mutation('create', record), 'owner', now), /PARTNER_INVALID/);
	record.request_data.end = '16:00';
	const changed = structuredClone(record); changed.request_data.flexible = true;
	assert.equal(applyPartnerMutation(state([record]), mutation('edit', changed), 'owner', now).changes[0].request_data.start, undefined);
});
