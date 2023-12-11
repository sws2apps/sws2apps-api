import fetch from 'node-fetch';

export const getSchedules = async (req, res, next) => {
	try {
		let { language } = req.params;

		language = language?.toUpperCase() || 'E';

		const url = `${process.env.SOURCE_MATERIALS_API}/${language}`;
		const resSrc = await fetch(url);

		const result = await resSrc.json();

		if (result.length > 0) {
			res.locals.type = 'info';
			res.locals.message = 'updated schedules fetched from jw.org';
			res.status(200).json(result);
		} else {
			res.locals.type = 'warn';
			res.locals.message = 'schedules could not be fetched because language is invalid or not available yet';
			res.status(404).json({ message: 'FETCHING_FAILED' });
		}
	} catch (err) {
		next(err);
	}
};

export const isPublicationExist = async (req, res, next) => {
	try {
		let { language, issue } = req.params;
		language = language.toUpperCase();

		const url =
			process.env.JW_CDN +
			new URLSearchParams({
				langwritten: language,
				pub: 'mwb',
				output: 'json',
				issue,
			});

		const resLocal = await fetch(url);

		if (resLocal.status === 200) {
			const result = await resLocal.json();

			res.locals.type = 'info';
			res.locals.message = 'publication check successfull';
			res.status(200).json(result);
			return;
		}

		res.locals.type = 'warn';
		res.locals.message = 'publication could not be found';
		res.status(404).json({ message: 'PUBLICATION_NOT_FOUND' });
	} catch (err) {
		next(err);
	}
};
