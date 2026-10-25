import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import routes from '#modules/territories/routes.js';
import {
	getTerritories,
	postTerritoryCommand,
	putTerritoryPolicy,
} from '#modules/territories/territory.controller.js';
import { User } from '#modules/users/user.js';

describe('territory HTTP security', () => {
	it('requires authentication for reads, commands and policy changes', async () => {
		const app = express();
		app.use(express.json());
		app.use('/congregations/:id/territories', routes);
		for (const response of await Promise.all([
			request(app).get('/congregations/cong/territories'),
			request(app).put('/congregations/cong/territories/policy').send({}),
			request(app).post('/congregations/cong/territories/t1/commands').send({}),
		])) {
			assert.equal(response.status, 400);
			assert.deepEqual(response.body, { message: 'INPUT_INVALID' });
		}
	});

	it('returns stable forbidden responses for cross-congregation access before touching storage', async () => {
		const app = express();
		app.use(express.json());
		const user = new User('manager');
		user.profile.congregation = { id: 'own', cong_role: ['admin'], account_type: 'vip' };
		app.use((_req, res, next) => {
			res.locals.currentUser = user;
			next();
		});
		app.get('/:id', getTerritories);
		app.put('/:id/policy', putTerritoryPolicy);
		app.post('/:id/:territoryId', postTerritoryCommand);
		for (const response of await Promise.all([
			request(app).get('/another'),
			request(app).put('/another/policy').send({}),
			request(app).post('/another/t1').send({}),
		])) {
			assert.equal(response.status, 403);
			assert.deepEqual(response.body, { message: 'UNAUTHORIZED_ACCESS' });
		}
	});
});
