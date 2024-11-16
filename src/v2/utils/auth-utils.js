import fetch from 'node-fetch';

const USER_PARSER_API_KEY = process.env.USER_PARSER_API_KEY;

export const retrieveVisitorDetails = async (visitorIP, visitorAgent) => {
	try {
		const resAgent = await fetch(
			`https://api.userparser.com/1.1/detect?ua=${visitorAgent}&ip=${visitorIP}&api_key=${USER_PARSER_API_KEY}`
		);
		const resIP = await fetch(`https://ipapi.co/${visitorIP}/json`);

		if (resAgent.status !== 200 || resIP.status !== 200) {
			throw new Error('THIRDY_PARTY_ERROR');
		}

		const dataAgent = await resAgent.json();
		const dataIP = await resIP.json();

		const visitorDetails = {
			browser: `${dataAgent.browser.name} (${dataAgent.browser.fullVersion})`,
			os: `${dataAgent.operatingSystem.name} ${dataAgent.operatingSystem.version}`,
			ip: visitorIP,
			ipLocation: {
				continent_code: dataIP.continent_code || '',
				country_name: dataIP.country_name || '',
				country_code: dataIP.country_code_iso3 || dataIP.country_code || '',
				city: dataIP.city || '',
				timezone: dataIP.timezone || '',
			},
		};

		return visitorDetails;
	} catch (err) {
		throw new Error(err);
	}
};
