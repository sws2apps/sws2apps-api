// dependency
import 'dotenv/config';

// app import
import app from './src/app.js';

// load utils
import { logger } from './src/utils/logger.js';

// load classes
import { Users } from './src/classes/Users.js';
import { Congregations } from './src/classes/Congregations.js';
import { CongregationRequests } from './src/classes/CongregationRequests.js';

const PORT = process.env.PORT || 8000;
const APP_VERSION = process.env.npm_package_version;

app.listen(PORT, async () => {
	await Users.loadAll();
	await Congregations.loadAll();
	await CongregationRequests.loadAll();

	logger(
		'info',
		JSON.stringify({ details: `server up and running (v${APP_VERSION})` })
	);
});
