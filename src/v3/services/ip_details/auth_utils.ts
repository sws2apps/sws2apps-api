import { Request } from 'express';
import fetch from 'node-fetch';
import WhichBrowser from 'which-browser';
import { IPAPIResponse } from '../../denifition/ip.js';

const APIs = [
	{
		host: 'https://ipapi.co/${visitorIP}/json',
		map: {
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
		map: {
			continentCode: 'continent_code',
			countryName: 'country_name',
			countryCode: 'country_code',
			cityName: 'city',
			timeZones: 'timezone',
		},
	},
];

export const retrieveVisitorDetails = async (visitorIP: string, req: Request) => {
	try {
		const resultAPI = {} as Record<string, string | string[]>;

		let currentIndex = 0;
		for await (const api of APIs) {
			try {
				const host = api.host.replace('${visitorIP}', visitorIP);

				const res = await fetch(host);

				if (res.status !== 200 && currentIndex === APIs.length - 1) {
					throw new Error('THIRDY_PARTY_ERROR_IP_DETAILS');
				}

				if (res.status === 200) {
					const dataIP = (await res.json()) as Record<string, string | string[]>;

					for (const [key, value] of Object.entries(api.map)) {
						resultAPI[value] = dataIP[key];
					}

					break;
				}
				currentIndex++;
			} catch {
				if (currentIndex === APIs.length - 1) {
					throw new Error('THIRDY_PARTY_ERROR_IP_DETAILS');
				}

				currentIndex++;

				continue;
			}
		}

		const dataIP = resultAPI as IPAPIResponse;

		const result = new WhichBrowser(req.headers);

		const visitorDetails = {
			browser: result.browser.toString(),
			os: result.os.toString(),
			ip: visitorIP,
			ipLocation: {
				continent_code: dataIP.continent_code || '',
				country_name: dataIP.country_name || '',
				country_code: dataIP.country_code_iso3 || dataIP.country_code || '',
				city: dataIP.city || '',
				timezone: dataIP.timezone || '',
			},
			isMobile: result.getType() !== 'desktop',
		};

		return visitorDetails;
	} catch (err) {
		throw new Error(String(err));
	}
};
