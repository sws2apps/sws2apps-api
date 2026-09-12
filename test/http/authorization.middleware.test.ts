import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';

import type { AppRoleType } from '#domain/users/app-role.js';
import {
	requireCongregationAdministrator,
	requireGlobalAdministrator,
	requireMeetingEditor,
	requirePublicTalkCoordinator,
} from '#http/middleware/authorization.middleware.js';

type MiddlewareFactory = () => (
	request: Request,
	response: Response,
	next: NextFunction,
) => Promise<void>;

const runAuthorization = async (
	middlewareFactory: MiddlewareFactory,
	globalRole: 'admin' | 'vip' | 'pocket',
	congregationRoles: AppRoleType[] = [],
	pointedResourceId = 'congregation-1',
	membershipId: string | null = 'congregation-1',
) => {
	const state: {
		statusCode?: number;
		body?: unknown;
		continued: boolean;
		locals: Record<string, unknown>;
	} = {
		continued: false,
		locals: {
			currentUser: {
				profile: {
					role: globalRole,
					congregation:
						membershipId === null
							? undefined
							: { id: membershipId, cong_role: congregationRoles },
				},
			},
		},
	};

	const response = {
		locals: state.locals,
		status(statusCode: number) {
			state.statusCode = statusCode;
			return this;
		},
		json(body: unknown) {
			state.body = body;
			return this;
		},
	} as unknown as Response;
	const next = (() => {
		state.continued = true;
	}) as NextFunction;

	await middlewareFactory()(
		{ params: { id: pointedResourceId } } as unknown as Request,
		response,
		next,
	);
	return state;
};

const assertAccessDenied = (state: Awaited<ReturnType<typeof runAuthorization>>) => {
	assert.equal(state.continued, false);
	assert.equal(state.statusCode, 403);
	assert.deepEqual(state.body, { message: 'UNAUTHORIZED_ACCESS' });
	assert.equal(state.locals.failedLoginAttempt, true);
	assert.equal(state.locals.type, 'warn');
	assert.equal(state.locals.message, 'user does not have the required role');
};

describe('authorization middleware', () => {
	it('allows a global administrator', async () => {
		const state = await runAuthorization(requireGlobalAdministrator, 'admin');

		assert.equal(state.continued, true);
		assert.equal(state.statusCode, undefined);
	});

	it('rejects a non-administrator and tracks the failed attempt', async () => {
		assertAccessDenied(
			await runAuthorization(requireGlobalAdministrator, 'vip'),
		);
	});

	it('allows congregation administration roles', async () => {
		for (const role of ['admin', 'coordinator', 'secretary'] as AppRoleType[]) {
			const state = await runAuthorization(
				requireCongregationAdministrator,
				'vip',
				[role],
			);

			assert.equal(state.continued, true);
		}
	});

	it('allows a schedule editor but rejects a publisher', async () => {
		const editorState = await runAuthorization(
			requireMeetingEditor,
			'vip',
			['midweek_schedule'],
		);
		assert.equal(editorState.continued, true);

		assertAccessDenied(
			await runAuthorization(requireMeetingEditor, 'vip', ['publisher']),
		);
	});

	it('requires a public-talk role for coordinator access', async () => {
		const coordinatorState = await runAuthorization(
			requirePublicTalkCoordinator,
			'vip',
			['public_talk_schedule'],
		);
		assert.equal(coordinatorState.continued, true);

		assertAccessDenied(
			await runAuthorization(
				requirePublicTalkCoordinator,
				'vip',
				['weekend_schedule'],
			),
		);
	});

	it('rejects eligible roles for another congregation resource', async () => {
		assertAccessDenied(
			await runAuthorization(
				requireCongregationAdministrator,
				'vip',
				['admin'],
				'congregation-2',
			),
		);

		assertAccessDenied(
			await runAuthorization(
				requireMeetingEditor,
				'vip',
				['midweek_schedule'],
				'congregation-2',
			),
		);
	});

	it('rejects a caller without a congregation membership', async () => {
		assertAccessDenied(
			await runAuthorization(
				requireCongregationAdministrator,
				'vip',
				['admin'],
				'congregation-1',
				null,
			),
		);
	});
});

describe('congregation role guard Express wiring', () => {
	const congregationId = 'CD9133F3-6AD0-4C58-80D8-1118D68625EB';

	const createCongregationRouterApp = (
		registerGuard: (router: ReturnType<typeof express.Router>) => void,
	) => {
		const app = express();
		const router = express.Router();

		router.use((_request, response, next) => {
			response.locals.currentUser = {
				profile: {
					firstname: { value: 'admin', updatedAt: '2026-01-01T00:00:00.000Z' },
					lastname: { value: 'local', updatedAt: '2026-01-01T00:00:00.000Z' },
					role: 'vip',
					congregation: {
						id: congregationId,
						account_type: 'vip',
						cong_role: ['admin'],
					},
				},
			} as typeof response.locals.currentUser;
			next();
		});

		registerGuard(router);

		router.get('/:id/users', (_request, response) => {
			response.json({ message: 'access granted' });
		});

		app.use('/congregations/admin', router);

		return app;
	};

	it('grants an eligible admin when the guard binds the resource id', async () => {
		const app = createCongregationRouterApp((router) => {
			router.use('/:id', requireCongregationAdministrator());
		});

		await request(app)
			.get(`/congregations/admin/${congregationId}/users`)
			.expect(200)
			.expect({ message: 'access granted' });
	});

	it('denies an eligible admin when the guard runs before the id is parsed', async () => {
		const app = createCongregationRouterApp((router) => {
			router.use(requireCongregationAdministrator());
		});

		const response = await request(app).get(`/congregations/admin/${congregationId}/users`);

		assert.equal(response.status, 403);
		assert.deepEqual(response.body, { message: 'UNAUTHORIZED_ACCESS' });
	});

	it('denies an eligible admin requesting a different congregation resource', async () => {
		const app = createCongregationRouterApp((router) => {
			router.use('/:id', requireCongregationAdministrator());
		});

		await request(app)
			.get('/congregations/admin/SECOND-CONGREGATION/users')
			.expect(403)
			.expect({ message: 'UNAUTHORIZED_ACCESS' });
	});
});
