import 'dotenv/config';
import { LogLevel } from '@logtail/types';

import app from './app.js';
import { env } from './config/env.js';

import { logger } from './platform/logging/logger.js';
import { initializeUsers } from './modules/users/user-initialization.service.js';
import { initializeCongregations } from './modules/congregations/congregation-initialization.service.js';
import { initializeFeatureFlags } from './modules/feature-flags/feature-flag-initialization.service.js';
import { initializeInstallations } from './modules/installations/installation-initialization.service.js';
import { initializeMinimumClientVersion } from './modules/administration/administration-settings.service.js';
import { createDevelopmentUsers } from './bootstrap/development-users.js';
import { serverState } from './platform/runtime/server-state.js';
import { removeOutdatedUserSessions } from './modules/users/user-lifecycle.service.js';
import { cleanUpLegacyCongregationSettings } from './modules/congregations/congregation-lifecycle.service.js';

await initializeMinimumClientVersion();
await createDevelopmentUsers();

logger(LogLevel.Info, `minimum frontend client version set to ${serverState.minimumAppVersion}`);

app.listen(env.port, async () => {
	logger(LogLevel.Info, `server up and running on port ${env.port} (v${env.appVersion})`);

	const start = performance.now();

	logger(LogLevel.Info, `loading firebase data`, { service: 'firebase' });

	await initializeUsers();
	await initializeCongregations();
	await cleanUpLegacyCongregationSettings();
	await initializeFeatureFlags();
	await initializeInstallations();

	// non-blocking calls
	removeOutdatedUserSessions();

	const end = performance.now();
	const durationMs = Math.round(end - start);

	logger(LogLevel.Info, `loading firebase completed`, { service: 'firebase', duration: durationMs });

	serverState.isReady = true;
});
