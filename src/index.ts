import 'dotenv/config';
import { LogLevel } from '@logtail/types';

import app from './app.js';
import { env } from './config/env.js';

import { logger } from './v3/services/logger/logger.js';
import { BackupForStorage } from './v3/definition/congregation.js';
import { UsersList } from './v3/classes/Users.js';
import { CongregationsList } from './v3/classes/Congregations.js';
import { Flags } from './v3/classes/Flags.js';
import { Installation } from './v3/classes/Installation.js';
import { initializeAPI } from './v3/config/app.db_config.js';
import { createDevTestUsers } from './v3/config/dev.config.js';
import { serverState } from './platform/runtime/server-state.js';

export const backupUploadsInProgress = new Map<string, BackupForStorage>();

await initializeAPI();
await createDevTestUsers();

logger(LogLevel.Info, `minimum frontend client version set to ${serverState.minimumAppVersion}`);

app.listen(env.port, async () => {
	logger(LogLevel.Info, `server up and running on port ${env.port} (v${env.appVersion})`);

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
	const durationMs = Math.round(end - start);

	logger(LogLevel.Info, `loading firebase completed`, { service: 'firebase', duration: durationMs });

	serverState.isReady = true;
});
