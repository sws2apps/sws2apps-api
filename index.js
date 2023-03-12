// dependency
import 'dotenv/config';

// app import
import app from './src/app.js';

// load utils
import { logger } from './src/utils/logger.js';

// load classes
import { users } from './src/classes/Users.js';
import { congregations } from './src/classes/Congregations.js';

const PORT = process.env.PORT || 8000;
const APP_VERSION = process.env.npm_package_version;

// define global variables
global.requestTracker = [];

await users.loadAll();
await congregations.loadAll();

app.listen(PORT, async () => {
	logger('info', JSON.stringify({ details: `server up and running (v${APP_VERSION})` }));
});

export { app as api };
