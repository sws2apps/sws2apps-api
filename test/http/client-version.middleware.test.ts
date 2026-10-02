import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { clientVersionChecker } from '#http/middleware/client-version.middleware.js';
import { serverState } from '#platform/runtime/server-state.js';

const originalMinimumAppVersion = serverState.minimumAppVersion;

afterEach(() => {
	serverState.minimumAppVersion = originalMinimumAppVersion;
});

const runClientVersionCheck = async (headers: Record<string, string> = {}) => {
	const state: {
		statusCode?: number;
		body?: unknown;
		continued: boolean;
		nextError?: unknown;
		locals: Record<string, unknown>;
	} = {
		continued: false,
		locals: {},
	};
	const request = { headers } as unknown as Request;
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
	const next = ((error?: unknown) => {
		state.continued = error === undefined;
		state.nextError = error;
	}) as NextFunction;

	await clientVersionChecker()(request, response, next);
	return state;
};

describe('client version middleware', () => {
	it('lets a client that presents no identity headers through', async () => {
		serverState.minimumAppVersion = '99.0.0';
		const state = await runClientVersionCheck();

		assert.equal(state.continued, true);
		assert.equal(state.statusCode, undefined);
		assert.equal(state.body, undefined);
		assert.equal(state.nextError, undefined);
	});

	it('rejects a declared version that names no client', async () => {
		const state = await runClientVersionCheck({ appversion: '3.50.0' });

		assert.equal(state.continued, false);
		assert.equal(state.statusCode, 400);
		assert.deepEqual(state.body, { message: 'INPUT_INVALID' });
		assert.equal(state.locals.type, 'warn');
		assert.match(String(state.locals.message), /^invalid input:/);
	});

	it('lets a self-identified client through without declaring a version', async () => {
		serverState.minimumAppVersion = '99.0.0';
		const state = await runClientVersionCheck({ appclient: 'organized' });

		assert.equal(state.continued, true);
		assert.equal(state.statusCode, undefined);
		assert.equal(state.body, undefined);
		assert.equal(state.nextError, undefined);
	});

	it('rejects a self-identified client with an empty client header', async () => {
		const state = await runClientVersionCheck({ appclient: '' });

		assert.equal(state.continued, false);
		assert.equal(state.statusCode, 400);
		assert.deepEqual(state.body, { message: 'INPUT_INVALID' });
	});

	it('rejects an identified client with an empty client header', async () => {
		const state = await runClientVersionCheck({ appclient: '', appversion: '1.0.0' });

		assert.equal(state.continued, false);
		assert.equal(state.statusCode, 400);
		assert.deepEqual(state.body, { message: 'INPUT_INVALID' });
	});

	it('rejects an empty declared version', async () => {
		const state = await runClientVersionCheck({ appclient: 'organized', appversion: '' });

		assert.equal(state.continued, false);
		assert.equal(state.statusCode, 400);
		assert.deepEqual(state.body, { message: 'INPUT_INVALID' });
	});

	it('rejects malformed client versions before compatibility checks', async () => {
		const state = await runClientVersionCheck({
			appclient: 'organized',
			appversion: 'latest',
		});

		assert.equal(state.statusCode, 400);
		assert.deepEqual(state.body, { message: 'INPUT_INVALID' });
	});

	it('rejects an outdated Organized client with the stable public error', async () => {
		serverState.minimumAppVersion = '3.50.0';
		const state = await runClientVersionCheck({
			appclient: 'organized',
			appversion: '3.49.9',
		});

		assert.equal(state.continued, false);
		assert.equal(state.statusCode, 400);
		assert.deepEqual(state.body, { message: 'CLIENT_VERSION_OUTDATED' });
		assert.equal(state.locals.message, 'client version outdated');
	});

	it('continues for a supported Organized client', async () => {
		serverState.minimumAppVersion = '3.50.0';
		const state = await runClientVersionCheck({
			appclient: 'organized',
			appversion: '3.50.0',
		});

		assert.equal(state.continued, true);
		assert.equal(state.statusCode, undefined);
		assert.equal(state.nextError, undefined);
	});

	it('does not apply Organized compatibility rules to another valid client', async () => {
		serverState.minimumAppVersion = '99.0.0';
		const state = await runClientVersionCheck({
			appclient: 'another-client',
			appversion: '1.0.0',
		});

		assert.equal(state.continued, true);
		assert.equal(state.statusCode, undefined);
	});
});
