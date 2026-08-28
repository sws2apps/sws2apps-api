import { Request } from 'express';
import fetch from 'node-fetch';
import WhichBrowser from 'which-browser';

type LocationValue = string | string[];

type IpLocation = {
	continent_code: string;
	country_name: string;
	country_code_iso3?: string;
	country_code: string;
	city: string;
	timezone: LocationValue;
};

type LocationProvider = {
	host: string;
	fieldMap: Record<string, keyof IpLocation>;
};

const locationProviders: LocationProvider[] = [
	{
		host: 'https://ipapi.co/${visitorIP}/json',
		fieldMap: {
			continent_code: 'continent_code',
			country_name: 'country_name',
			country_code: 'country_code',
			country_code_iso3: 'country_code_iso3',
			city: 'city',
			timezone: 'timezone',
		},
	},
	{
		host: 'https://freeipapi.com/api/json/${visitorIP}',
		fieldMap: {
			continentCode: 'continent_code',
			countryName: 'country_name',
			countryCode: 'country_code',
			cityName: 'city',
			timeZones: 'timezone',
		},
	},
];

export const mapProviderLocation = (
	providerData: Record<string, LocationValue>,
	fieldMap: Record<string, keyof IpLocation>,
): Partial<IpLocation> => {
	const mappedLocation: Record<string, LocationValue> = {};

	for (const [providerField, locationField] of Object.entries(fieldMap)) {
		mappedLocation[locationField] = providerData[providerField];
	}

	return mappedLocation as Partial<IpLocation>;
};

export const normalizeIpLocation = (location: Partial<IpLocation>): Omit<IpLocation, 'country_code_iso3'> => {
	return {
		continent_code: location.continent_code || '',
		country_name: location.country_name || '',
		country_code: location.country_code_iso3 || location.country_code || '',
		city: location.city || '',
		timezone: location.timezone || '',
	};
};

const retrieveIpLocation = async (visitorIp: string): Promise<Partial<IpLocation>> => {
	if (visitorIp === '::1') {
		return {
			continent_code: 'LCL',
			country_name: 'Local Dev',
			country_code: 'LCL',
			city: 'Local Dev',
		};
	}

	for (const [providerIndex, provider] of locationProviders.entries()) {
		const isLastProvider = providerIndex === locationProviders.length - 1;

		try {
			const providerUrl = provider.host.replace('${visitorIP}', visitorIp);
			const response = await fetch(providerUrl);

			if (response.status === 200) {
				const providerData = (await response.json()) as Record<string, LocationValue>;

				return mapProviderLocation(providerData, provider.fieldMap);
			}

			if (isLastProvider) {
				throw new Error('THIRDY_PARTY_ERROR_IP_DETAILS');
			}
		} catch {
			if (isLastProvider) {
				throw new Error('THIRDY_PARTY_ERROR_IP_DETAILS');
			}
		}
	}

	throw new Error('THIRDY_PARTY_ERROR_IP_DETAILS');
};

export const retrieveVisitorDetails = async (visitorIp: string, request: Request) => {
	const location = await retrieveIpLocation(visitorIp);
	const browserDetails = new WhichBrowser(request.headers);

	return {
		browser: browserDetails.browser.toString(),
		os: browserDetails.os.toString(),
		ip: visitorIp,
		ipLocation: normalizeIpLocation(location),
		isMobile: browserDetails.getType() !== 'desktop',
	};
};
