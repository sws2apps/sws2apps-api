import rateLimit from 'express-rate-limit';
import { requireTerritorySession } from '#modules/territories/territory-authentication.js';
import type { SessionAuthenticationDependencies } from '#http/middleware/session-authentication.middleware.js';
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

describe('territory session compatibility', () => {
	const appFor = (role: 'pocket' | 'vip', withToken = false) => {
		const user = new User('account');
		user.profile.role = role;
		user.profile.mfa_enabled = true;
		const dependencies = {
			resolvePocketUser: () => user,
			verifyToken: async () => 'account',
			resolveSession: () => ({ status: 'resolved', user, session: { mfaVerified: false } }),
			refreshSession: async () => {},
		} as unknown as SessionAuthenticationDependencies;
		const app = express();
		app.use((req, _res, next) => {
			req.signedCookies = { visitorid: 'signed-session' };
			if (withToken) req.headers.authorization = 'Bearer token';
			next();
		});
		app.use(rateLimit({ windowMs: 60000, limit: 100 }));
			app.use(requireTerritorySession(dependencies));
		app.get('/', (_req, res) => {
			res.sendStatus(204);
		});
		return app;
	};
	it('accepts the existing Pocket signed session', async () => {
		assert.equal((await request(appFor('pocket')).get('/')).status, 204);
	});
	it('does not let a VIP account bypass its token by presenting a signed cookie', async () => {
		assert.equal((await request(appFor('vip')).get('/')).status, 403);
	});
	it('does not let a VIP account bypass MFA even with its token', async () => {
		assert.equal((await request(appFor('vip', true)).get('/')).status, 401);
	});
});
