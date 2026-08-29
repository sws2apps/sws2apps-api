export const toMondayFirstWeekday = (sundayFirstWeekday: number): number => {
	if (sundayFirstWeekday === 0) {
		return 6;
	}

	return sundayFirstWeekday - 1;
};
