import assert from 'node:assert/strict';
import { it } from 'node:test';

import { getFieldServiceMetadata } from '#modules/field-service-meetings/index.js';

it('reads stored revisions without downloading the meeting document', async () => {
	const metadata = await getFieldServiceMetadata('congregation', {
		getMetadata: async () => ({ metadata: { meetings_revision: 'meetings', scope_revision: 'scope' } }),
		getDocument: async () => { throw new Error('Document download must be skipped'); },
	});
	assert.deepEqual(metadata, { field_service_meetings: 'meetings', field_service_scheduling: 'scope' });
});

it('falls back to the document when legacy object metadata lacks either revision', async () => {
	for (const metadata of [undefined, { meetings_revision: 'partial' }]) {
		const result = await getFieldServiceMetadata('congregation', {
			getMetadata: async () => ({ metadata }),
			getDocument: async () => ({ scope: [], meetings: [], scope_revision: 'scope', meetings_revision: 'meetings' }),
		});
		assert.deepEqual(result, { field_service_meetings: 'meetings', field_service_scheduling: 'scope' });
	}
});
