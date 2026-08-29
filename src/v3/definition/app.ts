export type StandardRecord = Record<string, unknown>;

export type Translation = {
	[key: string]: {
		[key: string]: string;
	};
};

export type Country = {
	countryGuid: string;
	countryCode: string;
	countryName: string;
};
