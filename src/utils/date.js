export const getWeekDate = (weekOf) => {
	const month = +weekOf.split('/')[0] - 1;
	const day = +weekOf.split('/')[1];
	const year = +weekOf.split('/')[2];

	return new Date(year, month, day);
};

export const getOldestWeekDate = () => {
	const today = new Date();
	const day = today.getDay();
	const diff = today.getDate() - day + (day === 0 ? -6 : 1);
	const weekDate = new Date(today.setDate(diff));
	const validDate = weekDate.setMonth(weekDate.getMonth() - 12);
	return new Date(validDate);
};
