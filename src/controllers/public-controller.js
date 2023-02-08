import fetch from 'node-fetch';
import { loadEPUB } from 'jw-epub-parser/dist/node/index.js';

export const getSchedules = async (req, res, next) => {
	try {
		let { language } = req.params;
		language = language.toUpperCase();

		// get current issue
		const today = new Date();
		const day = today.getDay();
		const diff = today.getDate() - day + (day === 0 ? -6 : 1);
		const weekDate = new Date(today.setDate(diff));
		const currentMonth = weekDate.getMonth() + 1;
		const monthOdd = currentMonth % 2 === 0 ? false : true;
		let monthMwb = monthOdd ? currentMonth : currentMonth - 1;
		let currentYear = weekDate.getFullYear();

		let notFound = false;
		const mergedSources = [];

		do {
			const issueDate = currentYear + String(monthMwb).padStart(2, '0');
			const url =
				process.env.JW_CDN +
				new URLSearchParams({
					langwritten: language,
					pub: 'mwb',
					output: 'json',
					issue: issueDate,
				});

			const res = await fetch(url);
			if (res.status === 404) {
				notFound = true;
			} else {
				const result = await res.json();
				const hasEPUB = result.files[language].EPUB;

				if (hasEPUB) {
					const epubFile = hasEPUB[0].file;
					const epubUrl = epubFile.url;
					const epubModifiedDate = epubFile.modifiedDatetime;

					const epubData = await loadEPUB({ url: epubUrl });
					const obj = {
						issueDate,
						modifiedDateTime: epubModifiedDate,
						...epubData,
					};

					mergedSources.push(obj);
				}

				if (!hasEPUB) {
					const url =
						process.env.JW_FINDER +
						new URLSearchParams({
							wtlocale: language,
							pub: 'mwb',
							issue: issueDate,
						});

					const res = await fetch(url);
					const result = await res.text();

					const parser = new window.DOMParser();
					const htmlItem = parser.parseFromString(result, 'text/html');

					const docIds = [];
					const accordionItems = htmlItem.getElementsByClassName('docClass-106');
					for (const weekLink of accordionItems) {
						weekLink.classList.forEach((item) => {
							if (item.indexOf('docId-') !== -1) {
								docIds.push(item.split('-')[1]);
							}
						});
					}

					const htmlDocs = [];
					for (let z = 0; z < docIds.length; z++) {
						const docId = docIds[z];
						const finderLink = `https://www.jw.org/finder?wtlocale=${language}&docid=${docId}`;
						const res2 = await fetch(finderLink);
						const result2 = await res2.text();

						const parser = new window.DOMParser();
						const htmlItem = parser.parseFromString(result2, 'text/html');
						htmlDocs.push(htmlItem);
					}

					const htmlData = await loadEPUB({ htmlDocs, mwbYear: currentYear, lang: language });
					const obj = {
						issueDate,
						...htmlData,
					};

					mergedSources.push(obj);
				}

				// assigning next issue
				monthMwb = monthMwb + 2;
				if (monthMwb === 13) {
					monthMwb = 1;
					currentYear++;
				}
			}
		} while (notFound === false);

		if (mergedSources.length > 0) {
			res.locals.type = 'info';
			res.locals.message = 'updated schedules fetched from jw.org';
			res.status(200).json(mergedSources);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'schedules could not be fetched because language is invalid or not available yet';
			res.status(404).json({ message: 'FETCHING_FAILED' });
		}
	} catch (err) {
		next(err);
	}
};
