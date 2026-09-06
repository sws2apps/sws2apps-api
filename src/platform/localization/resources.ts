import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resource } from 'i18next';

import { ALL_LANGUAGES } from './languages.js';

const resources: Resource = {};

const findLocalesDirectory = (startingDirectory: string): string => {
	let currentDirectory = startingDirectory;

	while (true) {
		const localesDirectory = path.join(currentDirectory, 'locales');
		if (fs.existsSync(localesDirectory)) return localesDirectory;

		const parentDirectory = path.dirname(currentDirectory);
		if (parentDirectory === currentDirectory) {
			throw new Error('Unable to locate the localization resources directory');
		}

		currentDirectory = parentDirectory;
	}
};

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const localesDirectory = findLocalesDirectory(moduleDirectory);

for (const language of ALL_LANGUAGES) {
	const translationFile = path.join(localesDirectory, language.locale, 'main.json');
	const translations = fs.readFileSync(translationFile);

	resources[language.threeLettersCode] = {};
	resources[language.threeLettersCode].translation = JSON.parse(
		translations.toString(),
	);
}

export default resources;
