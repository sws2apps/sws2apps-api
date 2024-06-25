import fs from 'fs';
import i18next from 'i18next';
import { ALL_LANGUAGES } from '../constant/constant.js';

// if no language parameter is passed, let's try to use the node.js system's locale
const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;

const resources = {};

for await (const language of ALL_LANGUAGES) {
	resources[language.code] = {};
	resources[language.code].translation = JSON.parse(
		await fs.promises.readFile(new URL(`../../../locales/${language.locale}/main.json`, import.meta.url))
	);
}

i18next.init({
	lng: 'e',
	fallbackLng: 'e',
	resources,
});

export const i18n = (lng) => i18next.getFixedT(lng || systemLocale);
