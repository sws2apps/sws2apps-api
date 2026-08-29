import 'dotenv/config';
import { LogLevel } from '@logtail/types';

import app from './app.js';
import { env } from './config/env.js';

import { logger } from './platform/logging/logger.js';
import { UsersList } from './modules/users/users.js';
import { CongregationsList } from './modules/congregations/congregations.js';
import { Flags } from './modules/feature-flags/flags.js';
import { InstallationsList } from './modules/installations/installation-list.js';
import { initializeMinimumClientVersion } from './modules/administration/administration-settings.service.js';
import { createDevelopmentUsers } from './bootstrap/development-users.js';
import { serverState } from './platform/runtime/server-state.js';

await initializeMinimumClientVersion();
await createDevelopmentUsers();

logger(LogLevel.Info, `minimum frontend client version set to ${serverState.minimumAppVersion}`);

app.listen(env.port, async () => {
	logger(LogLevel.Info, `server up and running on port ${env.port} (v${env.appVersion})`);

	const start = performance.now();

	logger(LogLevel.Info, `loading firebase data`, { service: 'firebase' });

	await UsersList.load();
	await CongregationsList.load();
	await CongregationsList.cleanupTasks();
	await Flags.load();
	await InstallationsList.load();

	// non-blocking calls
	UsersList.removeOutdatedSessions();

	const end = performance.now();
	const durationMs = Math.round(end - start);

	logger(LogLevel.Info, `loading firebase completed`, { service: 'firebase', duration: durationMs });

	serverState.isReady = true;
});
