import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

const enabled = process.env.RUN_FIREBASE_EMULATOR_TESTS === 'true';
test('authenticated publishers share requests, race safely, retry and cancel through the live HTTP/storage stack', { skip: !enabled }, async () => {
	assert.match(process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
	await import('#platform/firebase/firebase-app.js');
	const { env } = await import('#config/env.js');
	const { User } = await import('#modules/users/user.js');
	const { UsersList } = await import('#modules/users/index.js');
	const { Congregation } = await import('#modules/congregations/congregation.js');
	const { CongregationsList } = await import('#modules/congregations/index.js');
	const { default: routes } = await import('#modules/preaching-partner/routes.js');
	const { deleteFileFromStorage } = await import('#platform/firebase/storage.js');
	const congregation = new Congregation(`partner-integration-${crypto.randomUUID()}`);
	congregation.settings.data_sync.value = true;
	const users = ['alice', 'bob', 'carol'].map((name) => {
		const user = new User(`${congregation.id}-${name}`);
		user.profile.congregation = { id: congregation.id, account_type: 'pocket', cong_role: ['publisher'], user_local_uid: name };
		user.sessions = [{ visitorid: user.id, identifier: user.id, last_seen: new Date().toISOString(), visitor_details: { browser: '', ip: '', ipLocation: { city: '', continent_code: '', country_code: '', country_name: '', timezone: '' }, isMobile: false, os: '' } }];
		return user;
	});
	const previousUsers = UsersList.list;
	const previousCongregations = CongregationsList.list;
	UsersList.list = [...previousUsers, ...users];
	CongregationsList.list = [...previousCongregations, congregation];
	const app = express(); app.use(express.json(), cookieParser(env.encryptionKey)); app.use('/api/v3/preaching-partner', routes);
	const cookie = (index: number) => {
		const value = users[index].id;
		const signature = createHmac('sha256', env.encryptionKey).update(value).digest('base64').replace(/=+$/, '');
		return `visitorid=${encodeURIComponent(`s:${value}.${signature}`)}`;
	};
	const path = `/api/v3/preaching-partner/pockets/${congregation.id}`;
	const record = { request_uid: crypto.randomUUID(), request_data: { person_uid: 'impersonated', date: '2099/12/31', flexible: true, type: 0, comment: 'Encrypted shared request', updatedAt: new Date().toISOString(), _deleted: false } };
	try {
		assert.equal((await request(app).get(path)).status, 403);
		const created = await request(app).post(path).set('Cookie', cookie(0)).send({ publisher_uid: 'alice', operationId: crypto.randomUUID(), action: 'create', request: record });
		assert.equal(created.status, 200);
		assert.equal(created.body.requests[0].request_data.person_uid, 'alice');
		const listed = await request(app).get(path).set('Cookie', cookie(1));
		assert.equal(listed.body.publisher_uid, 'bob');
		assert.equal(listed.body.requests[0].request_uid, record.request_uid);
		const shared = listed.body.requests[0];
		const join = { publisher_uid: 'bob', operationId: crypto.randomUUID(), action: 'join', request: shared };
		const races = await Promise.all([
			request(app).post(path).set('Cookie', cookie(1)).send(join),
			request(app).post(path).set('Cookie', cookie(2)).send({ ...join, publisher_uid: 'carol', operationId: crypto.randomUUID() }),
		]);
		assert.deepEqual(races.map((response) => response.status).sort(), [200, 409]);
		const winner = races.findIndex((response) => response.status === 200);
		const publisher = winner === 0 ? 'bob' : 'carol';
		const joined = races[winner].body.requests[0];
		assert.equal(joined.request_data.partner_uid, publisher);
		if (winner === 0) assert.deepEqual((await request(app).post(path).set('Cookie', cookie(1)).send(join)).body.requests, races[0].body.requests);
		const switched = await request(app).post(path).set('Cookie', cookie(2)).send({ ...join, operationId: crypto.randomUUID() });
		assert.equal(switched.status, 403);
		assert.equal((await request(app).get('/api/v3/preaching-partner/pockets/another-congregation').set('Cookie', cookie(0))).status, 403);
		const cancelled = await request(app).post(path).set('Cookie', cookie(0)).send({ publisher_uid: 'alice', operationId: crypto.randomUUID(), action: 'cancel', request: joined });
		assert.equal(cancelled.status, 200);
		assert.equal(cancelled.body.requests[0].request_data.partner_uid, undefined);
		const removed = await request(app).post(path).set('Cookie', cookie(0)).send({ publisher_uid: 'alice', operationId: crypto.randomUUID(), action: 'delete', request: cancelled.body.requests[0] });
		assert.equal(removed.status, 200);
		assert.equal((await request(app).get(path).set('Cookie', cookie(1))).body.requests[0].request_data._deleted, true);
	} finally {
		UsersList.list = previousUsers; CongregationsList.list = previousCongregations;
		await deleteFileFromStorage({ type: 'congregation', path: congregation.id });
	}
});
