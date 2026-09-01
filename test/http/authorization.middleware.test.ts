import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

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
					congregation: { cong_role: congregationRoles },
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

	await middlewareFactory()({} as Request, response, next);
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
});
