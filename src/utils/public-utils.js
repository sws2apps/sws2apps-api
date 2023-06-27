import 'global-jsdom/register';
import fetch from 'node-fetch';
import { loadEPUB } from 'jw-epub-parser/dist/node/index.js';

export const fetchIssueData = async (issue) => {
	try {
		if (issue.hasEPUB) {
			const epubFile = issue.hasEPUB[0].file;
			const epubUrl = epubFile.url;

			const epubData = await loadEPUB({ url: epubUrl });
			return epubData;
		}

		if (!issue.hasEPUB) {
			return [];
		}
	} catch (err) {
		throw new Error(err);
	}
};

export const fetchData = async (language, issue) => {
	const mergedSources = [];

	if (issue === '') {
		for await (const pub of ['mwb', 'w']) {
			const issues = [];

			if (pub === 'mwb') {
				let notFound = false;

				// get current issue
				const today = new Date();
				const day = today.getDay();
				const diff = today.getDate() - day + (day === 0 ? -6 : 1);
				const weekDate = new Date(today.setDate(diff));
				const validDate = weekDate.setMonth(weekDate.getMonth());

				const startDate = new Date(validDate);
				const currentMonth = startDate.getMonth() + 1;
				const monthOdd = currentMonth % 2 === 0 ? false : true;
				let monthMwb = monthOdd ? currentMonth : currentMonth - 1;
				let currentYear = startDate.getFullYear();

				do {
					const issueDate = currentYear + String(monthMwb).padStart(2, '0');
					const url =
						process.env.JW_CDN +
						new URLSearchParams({
							langwritten: language,
							pub: 'mwb',
							fileformat: 'epub',
							output: 'json',
							issue: issueDate,
						});

					const res = await fetch(url);

					if (res.status === 200) {
						const result = await res.json();
						const hasEPUB = result.files[language].EPUB;

						issues.push({ issueDate, currentYear, language, hasEPUB: hasEPUB });
					}

					if (res.status === 404) {
						notFound = true;
					}

					// assigning next issue
					monthMwb = monthMwb + 2;
					if (monthMwb === 13) {
						monthMwb = 1;
						currentYear++;
					}
				} while (notFound === false);
			}

			if (pub === 'w') {
				let notFound = false;

				// get w current issue
				const today = new Date();
				const weekDate = new Date(today.setMonth(today.getMonth() - 2));
				let monthW = weekDate.getMonth() + 1;
				let currentYear = weekDate.getFullYear();

				do {
					const issueDate = currentYear + String(monthW).padStart(2, '0');
					const url =
						process.env.JW_CDN +
						new URLSearchParams({
							langwritten: language,
							pub,
							fileformat: 'epub',
							output: 'json',
							issue: issueDate,
						});

					const res = await fetch(url);

					if (res.status === 200) {
						const result = await res.json();
						const hasEPUB = result.files[language].EPUB;

						issues.push({ issueDate, currentYear, language, hasEPUB: hasEPUB });
					}

					if (res.status === 404) {
						notFound = true;
					}

					// assigning next issue
					monthW = monthW + 1;
					if (monthW === 13) {
						monthW = 1;
						currentYear++;
					}
				} while (notFound === false);
			}

			if (issues.length > 0) {
				const fetchSource1 = fetchIssueData(issues[0]);
				const fetchSource2 = issues.length > 1 ? fetchIssueData(issues[1]) : Promise.resolve([]);
				const fetchSource3 = issues.length > 2 ? fetchIssueData(issues[2]) : Promise.resolve([]);
				const fetchSource4 = issues.length > 3 ? fetchIssueData(issues[3]) : Promise.resolve([]);
				const fetchSource5 = issues.length > 4 ? fetchIssueData(issues[4]) : Promise.resolve([]);
				const fetchSource6 = issues.length > 5 ? fetchIssueData(issues[5]) : Promise.resolve([]);
				const fetchSource7 = issues.length > 6 ? fetchIssueData(issues[6]) : Promise.resolve([]);

				const allData = await Promise.all([
					fetchSource1,
					fetchSource2,
					fetchSource3,
					fetchSource4,
					fetchSource5,
					fetchSource6,
					fetchSource7,
				]);

				for (let z = 0; z < allData.length; z++) {
					const tempObj = allData[z];
					if (tempObj.length > 0) {
						for (const src of tempObj) {
							const date = src.mwb_week_date || src.w_study_date;

							const prevSrc = mergedSources.find((item) => item.mwb_week_date === date || item.w_study_date === date);

							if (prevSrc) {
								Object.assign(prevSrc, src);
							}

							if (!prevSrc) {
								mergedSources.push(src);
							}
						}
					}
				}
			}
		}
	}

	if (issue !== '') {
		const issues = [];

		const pub = issue.split('-')[1].split('_')[0];
		const pubIssue = issue.split('-')[1].split('_')[1];

		const url =
			process.env.JW_CDN +
			new URLSearchParams({
				langwritten: language,
				pub,
				fileformat: 'epub',
				output: 'json',
				issue: pubIssue,
			});

		const res = await fetch(url);

		if (res.status === 200) {
			const result = await res.json();
			const hasEPUB = result.files[language].EPUB;
			const currentYear = issue.substring(0, 4);
			issues.push({ issueDate: issue, currentYear, language, hasEPUB: hasEPUB });
		}

		if (issues.length > 0) {
			const data = await fetchIssueData(issues[0]);
			for (const src of data) {
				mergedSources.push(src);
			}
		}
	}

	for (const src of mergedSources) {
		if (src.mwb_week_date) {
			src.week_date = src.mwb_week_date;
			delete src.mwb_week_date;
		}

		if (src.w_study_date) {
			src.week_date = src.w_study_date;
			delete src.w_study_date;
		}
	}

	return mergedSources;
};

export const extractScheduleDocsId = async (htmlText, issue) => {
	const parser = new window.DOMParser();
	const htmlItem = parser.parseFromString(htmlText, 'text/html');

	const docIds = [];
	const accordionItems = htmlItem.getElementsByClassName(`docClass-106 iss-${issue}`);
	for (const weekLink of accordionItems) {
		weekLink.classList.forEach((item) => {
			if (item.indexOf('docId-') !== -1) {
				docIds.push(item.split('-')[1]);
			}
		});
	}

	return docIds;
};
