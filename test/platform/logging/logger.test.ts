import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { LogLevel } from '@logtail/types';

import { logger } from '#platform/logging/logger.js';

describe('platform logger', () => {
	it('strips carriage returns and newlines from local console entries', () => {
		const output: string[] = [];
		mock.method(console, 'log', (value: unknown) => {
			output.push(String(value));
		});

		try {
			logger(LogLevel.Info, 'backup chunk\rfinished\narrived');
		} finally {
			mock.restoreAll();
		}

		assert.ok(output.length > 0);
		assert.equal(output[0].includes('\r'), false);
		assert.equal(output[0].includes('\n'), false);
		assert.ok(output[0].includes('finished arrived'));
	});

	it('strips ANSI escape sequences that could spoof terminal output', () => {
		const output: string[] = [];
		mock.method(console, 'warn', (value: unknown) => {
			output.push(String(value));
		});

		try {
			logger(LogLevel.Warn, 'suspicious payload \u001B[2Jcleared');
		} finally {
			mock.restoreAll();
		}

		assert.ok(output.length > 0);
		assert.equal(output[0].includes(`\u001B`), false);
	});
});