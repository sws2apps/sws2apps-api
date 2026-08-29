export type OTPSecretType = { secret: string; uri: string; version: number };

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
