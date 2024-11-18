import fetch from 'node-fetch';

export const getSchedules = async (req, res) => {
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
};
