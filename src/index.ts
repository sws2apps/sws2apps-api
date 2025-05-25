import 'dotenv/config';
import { LogLevel } from '@logtail/types';

import app from './app.js';

import { logger } from './v3/services/logger/logger.js';
import { ServerTempVariableType } from './v3/definition/server.js';
import { UsersList } from './v3/classes/Users.js';
import { CongregationsList } from './v3/classes/Congregations.js';
import { Flags } from './v3/classes/Flags.js';
import { Installation } from './v3/classes/Installation.js';
import { initializeAPI } from './v3/config/app.db_config.js';
import { createAdminUser } from './v3/config/dev.config.js';

const PORT = process.env.PORT || 8000;
const APP_VERSION = process.env.npm_package_version;

export const API_VAR: ServerTempVariableType = {
	MINIMUM_APP_VERSION: '',
	IS_SERVER_READY: false,
	REQUEST_TRACKER: [],
};

await initializeAPI();
await createAdminUser();

logger(LogLevel.Info, `minimum frontend client version set to ${API_VAR.MINIMUM_APP_VERSION}`);

const start = performance.now();

logger(LogLevel.Info, `loading firebase data`, { service: 'firebase' });

await UsersList.load();
await CongregationsList.load();
await CongregationsList.cleanupTasks();
await Flags.load();
await Installation.load();

// non-blocking calls
UsersList.removeOutdatedSessions();

const end = performance.now();
const durationMs = end - start;
const totalSeconds = Math.floor(durationMs / 1000);
const minutes = Math.floor(totalSeconds / 60);

logger(LogLevel.Info, `loading firebase completed`, { service: 'firebase', duration: minutes });

app.listen(PORT, async () => {
	logger(LogLevel.Info, `server up and running on port ${PORT} (v${APP_VERSION})`);

	API_VAR.IS_SERVER_READY = true;
});
