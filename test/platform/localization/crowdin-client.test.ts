import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countProjectLanguages } from '#platform/localization/crowdin-client.js';

describe('Crowdin localization adapter', () => {
	it('counts target languages and the project source language', () => {
		const targetLanguages = [{ id: 'fr' }, { id: 'mg' }, { id: 'es' }];

		const languageCount = countProjectLanguages(targetLanguages);

		assert.equal(languageCount, 4);
	});

	it('counts the source language when no translations are configured', () => {
		const languageCount = countProjectLanguages([]);

		assert.equal(languageCount, 1);
	});
});
