import 'dotenv/config';

import app from './app.js';

import { logger } from './v3/services/logger/logger.js';
import { ServerTempVariableType } from './v3/definition/server.js';
import { UsersList } from './v3/classes/Users.js';
import { CongregationsList } from './v3/classes/Congregations.js';
import { initializeAPI } from './v3/config/app.db_config.js';

const PORT = process.env.PORT || 8000;
const APP_VERSION = process.env.npm_package_version;

export const API_VAR: ServerTempVariableType = {
	MINIMUM_APP_VERSION: '',
	IS_SERVER_READY: false,
	REQUEST_TRACKER: [],
};

await initializeAPI();

logger('info', JSON.stringify({ details: `API: minimum frontend client version set to ${API_VAR.MINIMUM_APP_VERSION}` }));

app.listen(PORT, async () => {
	logger('info', JSON.stringify({ details: `server up and running on port ${PORT} (v${APP_VERSION})` }));
	logger('info', JSON.stringify({ details: `loading Firebase data ...` }));

	await UsersList.load();
	await CongregationsList.load();

	logger('info', JSON.stringify({ details: `loading completed.` }));
	API_VAR.IS_SERVER_READY = true;
});
