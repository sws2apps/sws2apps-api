import 'dotenv/config';
import { LogLevel } from '@logtail/types';

import app from './app.js';

import { logger } from './v3/services/logger/logger.js';
import { ServerTempVariableType } from './v3/definition/server.js';
import { BackupForStorage } from './v3/definition/congregation.js';
import { UsersList } from './v3/classes/Users.js';
import { CongregationsList } from './v3/classes/Congregations.js';
import { Flags } from './v3/classes/Flags.js';
import { Installation } from './v3/classes/Installation.js';
import { initializeAPI } from './v3/config/app.db_config.js';
import { createDevTestUsers } from './v3/config/dev.config.js';

const PORT = process.env.PORT || 8000;
const APP_VERSION = process.env.npm_package_version;

export const API_VAR: ServerTempVariableType = {
	MINIMUM_APP_VERSION: '',
	IS_SERVER_READY: false,
	REQUEST_TRACKER: [],
};

export const backupUploadsInProgress = new Map<string, BackupForStorage>();

await initializeAPI();
await createDevTestUsers();

logger(LogLevel.Info, `minimum frontend client version set to ${API_VAR.MINIMUM_APP_VERSION}`);

app.listen(PORT, async () => {
	logger(LogLevel.Info, `server up and running on port ${PORT} (v${APP_VERSION})`);

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

	logger(LogLevel.Info, `loading firebase completed`, { service: 'firebase', duration: durationMs });

	API_VAR.IS_SERVER_READY = true;
});
