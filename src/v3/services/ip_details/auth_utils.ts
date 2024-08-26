import { Request } from 'express';
import fetch from 'node-fetch';
import WhichBrowser from 'which-browser';

type IPAPIResponse = {
	continentCode: string | undefined;
	countryName: string | undefined;
	countryCode: string | undefined;
	cityName: string | undefined;
	timeZones: string[] | undefined;
};

export const retrieveVisitorDetails = async (visitorIP: string, req: Request) => {
	try {
		const resIP = await fetch(`https://freeipapi.com/api/json/${visitorIP}`);

		if (resIP.status !== 200) {
			throw new Error('THIRDY_PARTY_ERROR');
		}

		const dataIP = (await resIP.json()) as IPAPIResponse;

		const result = new WhichBrowser(req.headers);

		const visitorDetails = {
			browser: result.browser.toString(),
			os: result.os.toString(),
			ip: visitorIP,
			ipLocation: {
				continent_code: dataIP.continentCode || '',
				country_name: dataIP.countryName || '',
				country_code: dataIP.countryCode || '',
				city: dataIP.cityName || '',
				timezone: dataIP.timeZones || '',
			},
			isMobile: result.getType() !== 'desktop',
		};

		return visitorDetails;
	} catch (err) {
		throw new Error(String(err));
	}
};
