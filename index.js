// dependency
import 'dotenv/config';

// app import
import app from './src/app.js';

// load utils
import { logger } from './src/utils/logger.js';

// load classes
import { users } from './src/classes/Users.js';
import { congregations } from './src/classes/Congregations.js';
import { initializeAPI } from './src/config/cpe.db-config.js';
import { publicTalks } from './src/classes/PublicTalk.js';

// load dev scripts
import { importPublicTalks } from './src/dev/setup.js';

const PORT = process.env.PORT || 8000;
const APP_VERSION = process.env.npm_package_version;

// define global variables
global.requestTracker = [];

await initializeAPI();
logger('info', JSON.stringify({ details: `API: minimum CPE client version set to ${global.minimumVersionCPE}` }));

await users.loadAll();
await congregations.loadAll();
await publicTalks.loadAll();

// dev initialize
if (process.env.NODE_ENV === 'development') {
	await importPublicTalks();
}

app.listen(PORT, async () => {
	logger('info', JSON.stringify({ details: `server up and running (v${APP_VERSION})` }));
});

export { app as api };
