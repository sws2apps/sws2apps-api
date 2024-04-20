import fetch from 'node-fetch';
import WhichBrowser from 'which-browser';

export const retrieveVisitorDetails = async (visitorIP, req) => {
	try {
		const resIP = await fetch(`https://ipapi.co/${visitorIP}/json`);

		if (resIP.status !== 200) {
			throw new Error('THIRDY_PARTY_ERROR');
		}

		const dataIP = await resIP.json();

		const result = new WhichBrowser(req.headers);
		console.log(result.browser.toString());

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
		throw new Error(err);
	}
};
