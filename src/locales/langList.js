export const ALL_LANGUAGES = [
	{ code: 'x', locale: 'de-DE', name: 'Deutsch', isUI: true, hasEPUB: true },
	{ code: 'e', locale: 'en', name: 'English', isUI: true, hasEPUB: true },
	{ code: 'mg', locale: 'mg-MG', name: 'Malagasy', isUI: true, hasEPUB: true },
	{
		code: 't',
		locale: 'pt-BR',
		name: 'Português (Brasil)',
		isUI: true,
		hasEPUB: false,
		WOL_DT: 'https://wol.jw.org/wol/dt/r5/lp-t',
	},
	{
		code: 'ttm',
		locale: 'mg-TTM',
		name: 'Tenin’ny Tanana Malagasy',
		isUI: true,
		hasEPUB: false,
		WOL_DT: 'https://wol.jw.org/wol/dt/r416/lp-ttm',
	},
	{ code: 'tnd', locale: 'mg-TND', name: 'Tandroy', isUI: false, hasEPUB: true },
	{ code: 'tnk', locale: 'mg-TNK', name: 'Tankarana', isUI: false, hasEPUB: true },
	{ code: 'vz', locale: 'mg-VZ', name: 'Vezo', isUI: false, hasEPUB: true },
	{ code: 'k', locale: 'uk-UA', name: 'Українська', isUI: true, hasEPUB: true },
];

export const LANGUAGE_LIST = ALL_LANGUAGES.filter((lang) => lang.isUI === true);
