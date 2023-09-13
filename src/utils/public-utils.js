import fetch from 'node-fetch';
import { loadEPUB, parseMWB, parseW } from 'jw-epub-parser/dist/node/index.js';
import { ALL_LANGUAGES } from '../locales/langList.js';

const fetchDataFromEPUB = async (language, issue) => {
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
						const epubURL = result.files[language].EPUB[0].file.url;
						issues.push({ issueDate, currentYear, language, epubURL });
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
				const url = `${process.env.WOL_E}/${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

				const res = await fetch(url);
				const data = await res.json();

				const wData = data.items.find((item) => item.classification === 68);
				const publicationTitle = wData.publicationTitle;

				const findYear = /\b\d{4}\b/;
				const array = findYear.exec(publicationTitle);
				let currentYear = +array[0];

				const months = [
					'January',
					'February',
					'March',
					'April',
					'May',
					'June',
					'July',
					'August',
					'September',
					'October',
					'November',
					'December',
				];

				const monthsRegex = `(${months.join('|')})`;

				const regex = new RegExp(monthsRegex);
				const array2 = regex.exec(publicationTitle);

				let monthW = months.findIndex((month) => month === array2[0]) + 1;

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
						const epubURL = result.files[language].EPUB[0].file.url;

						issues.push({ issueDate, currentYear, language, epubURL });
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
				const fetchSource1 = fetchIssueData(issues[0].epubURL);
				const fetchSource2 = issues.length > 1 ? fetchIssueData(issues[1].epubURL) : Promise.resolve([]);
				const fetchSource3 = issues.length > 2 ? fetchIssueData(issues[2].epubURL) : Promise.resolve([]);
				const fetchSource4 = issues.length > 3 ? fetchIssueData(issues[3].epubURL) : Promise.resolve([]);
				const fetchSource5 = issues.length > 4 ? fetchIssueData(issues[4].epubURL) : Promise.resolve([]);
				const fetchSource6 = issues.length > 5 ? fetchIssueData(issues[5].epubURL) : Promise.resolve([]);
				const fetchSource7 = issues.length > 6 ? fetchIssueData(issues[6].epubURL) : Promise.resolve([]);

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

const getMonthFirstWeek = () => {
	const today = new Date();
	const targetMonth = today.getMonth();
	const targetYear = today.getFullYear();
	const firstDateInMonth = new Date(targetYear, targetMonth, 1);
	const firstWeekdayInMonth = firstDateInMonth.getDay();
	const firstMondayDate = 1 + ((8 - firstWeekdayInMonth) % 7);
	return new Date(targetYear, targetMonth, firstMondayDate);
};

const fetchDailyDataWOL = async (queryDate, language) => {
	const WOL_DT = ALL_LANGUAGES.find((lang) => lang.code.toUpperCase() === language).WOL_DT;

	const year = queryDate.getFullYear();
	const url = `${WOL_DT}/${year}/${queryDate.getMonth() + 1}/${queryDate.getDate()}`;
	const res = await fetch(url);
	const data = await res.json();

	const src = {};

	if (data.items.length > 0) {
		const mwbData = data.items.find((item) => item.classification === 106)?.content;
		const wData = data.items.find((item) => item.classification === 68 && item.url)?.content;

		if (mwbData) {
			const mwbItems = parseMWB(mwbData, year, language);
			Object.assign(src, mwbItems);
		}

		if (wData) {
			const wItems = parseW(wData, language);
			Object.assign(src, wItems);
		}

		if (src.mwb_week_date) {
			src.week_date = src.mwb_week_date;
			delete src.mwb_week_date;
		}

		if (src.w_study_date) {
			src.week_date = src.w_study_date;
			delete src.w_study_date;
		}
	}

	return src;
};

const fetchDataFromWOL = async (language) => {
	const sources = [];

	let queryDate = getMonthFirstWeek();

	const allFetches = [];

	for (let i = 1; i <= 30; i++) {
		const fetch = fetchDailyDataWOL(queryDate, language);
		allFetches.push(fetch);
		queryDate.setDate(queryDate.getDate() + 7);
	}

	const result = await Promise.all(allFetches);

	for (const src of result) {
		if (src.week_date) {
			sources.push(src);
		}
	}

	return sources;
};

export const fetchIssueData = async (epubURL) => {
	try {
		const epubData = await loadEPUB({ url: epubURL });
		return epubData;
	} catch (err) {
		throw new Error(err);
	}
};

export const fetchData = async (language, issue) => {
	const hasEPUB = ALL_LANGUAGES.find((lang) => lang.code.toUpperCase() === language).hasEPUB;
	let data = [];

	if (hasEPUB) {
		data = await fetchDataFromEPUB(language, issue);
	}

	if (!hasEPUB) {
		data = await fetchDataFromWOL(language);
	}

	return data;
};
