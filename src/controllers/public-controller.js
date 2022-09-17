import fetch from 'node-fetch';
import { loadEPUB } from 'jw-epub-parser/dist/node.es/node.js';

export const getUpdatedSchedules = async (req, res, next) => {
	try {
		const { language, source_materials_details } = req.body;

        if (language !== 'E' && language !== 'MG') {
            res.locals.type = 'warn';
            res.locals.message = `invalid language for source material`;

            res.status(400).json({
                message: 'Bad request: provided inputs are invalid.',
            });

            return;
        }

        // get current issue
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const weekDate = new Date(today.setDate(diff));
        const currentMonth = weekDate.getMonth() + 1;
        const monthOdd = currentMonth % 2 === 0 ? false : true;
        let monthMwb = monthOdd ? currentMonth : currentMonth--;
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
                    fileformat: 'epub',
                    output: 'json',
                    issue: issueDate,
                });

            const res = await fetch(url);

            if (res.status === 404) {
                notFound = true;
            } else {
                const data = await res.json();
                const epubFile = data.files[language].EPUB[0].file
                const epubUrl = epubFile.url;
                const epubModifiedDate = epubFile.modifiedDatetime;

                const epubData = await loadEPUB({ url: epubUrl });
                const obj = {
                    issueDate,
                    ...epubData,
                };

                mergedSources.push(obj);
                
                // assigning next issue
                monthMwb = monthMwb + 2;
                if (monthMwb === 13) {
                    monthMwb = 1;
                    currentYear++;
                }
            }
        } while (notFound === false);

        res.locals.type = 'info';
        res.locals.message = 'updated schedules fetched from jw.org';
        res.status(200).json(mergedSources);
	} catch (err) {
		next(err);
	}
};
