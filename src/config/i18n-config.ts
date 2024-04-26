import fs from 'fs';
import i18next, { Resource } from 'i18next';
import { ALL_LANGUAGES } from '../constant/langList.js';

// if no language p../arameter is passed, let's try to use the node.js system's locale
const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;

const resources: Resource = {};

for await (const language of ALL_LANGUAGES) {
	const translations = await fs.promises.readFile(new URL(`../../locales/${language.locale}/main.json`, import.meta.url));

	resources[language.locale] = {};
	resources[language.locale].translation = JSON.parse(translations.toString());
}

i18next.init({
	lng: 'en',
	fallbackLng: 'en',
	resources,
});

export const i18n = (lng: string) => i18next.getFixedT(lng || systemLocale);
