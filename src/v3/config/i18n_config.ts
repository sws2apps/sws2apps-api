import fs from 'fs';
import { Resource } from 'i18next';
import { ALL_LANGUAGES } from '../constant/langList.js';

const resources: Resource = {};

for (const language of ALL_LANGUAGES) {
	const translations = fs.readFileSync(new URL(`../../../locales/${language.locale}/main.json`, import.meta.url));

	resources[language.locale] = {};
	resources[language.locale].translation = JSON.parse(translations.toString());
}

export default resources;
