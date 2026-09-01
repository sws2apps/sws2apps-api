import 'dotenv/config';
import { LogLevel } from '@logtail/types';

import '#platform/firebase/firebase-app.js';
import app from './app.js';
import { env } from '#config/env.js';

import { logger } from '#platform/logging/logger.js';
import { initializeUsers, removeOutdatedUserSessions } from '#modules/users/index.js';
import { initializeCongregations, cleanUpLegacyCongregationSettings } from '#modules/congregations/index.js';
import { initializeFeatureFlags } from '#modules/feature-flags/index.js';
import { initializeInstallations } from '#modules/installations/index.js';
import { initializeMinimumClientVersion } from '#modules/administration/index.js';
import { createDevelopmentUsers } from './bootstrap/development-users.js';
import { serverState } from '#platform/runtime/server-state.js';

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
