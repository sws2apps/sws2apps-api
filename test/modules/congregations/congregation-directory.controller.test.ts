import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';

import { getCongregations } from '#modules/congregations/controllers/congregation-directory.controller.js';

type ResponseState = {
	statusCode?: number;
	body?: unknown;
	locals: Record<string, unknown>;
};

const createResponse = () => {
	const state: ResponseState = { locals: {} };
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

	return { response, state };
};

const createRequest = (query: Record<string, unknown>) =>
	({ query }) as unknown as Request;

describe('congregation directory controller', () => {
	it('rejects tampered query parameters that are not plain strings', async () => {
		const tamperedRequests = [
			{ name: ['two names', 'extra'], country: 'MG' },
			{ name: 'Anta', country: ['MG', 'ZA'] },
			{ name: 'Anta' },
			{ name: 'A', country: 'MG' },
		];

		for (const query of tamperedRequests) {
			const { response, state } = createResponse();

			await getCongregations(createRequest(query), response);

			assert.equal(state.statusCode, 400);
			assert.deepEqual(state.body, { message: 'error_api_bad-request' });
		}
	});
});