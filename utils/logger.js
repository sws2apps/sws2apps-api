const dateformat = require('dateformat');
const requestIp = require('request-ip');

module.exports = (req, type, message) => {
	let log = `[${dateformat(Date.now(), 'yyyy-mm-dd HH:MM:ss')}] - `;
	log += `${type} - `;
	if (req) {
		const clientIp = requestIp.getClientIp(req);
		log += `from ${req.origin || req.hostname}(${clientIp}) - `;
		log += `to ${req.path} - `;
		log += `using ${req.method} - `;
	}
	log += `${message}`;

	console.log(log);
};
