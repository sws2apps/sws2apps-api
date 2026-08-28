import type { RequestTrackerType } from '../../v3/definition/server.js';

/**
 * Process-local state shared by request middleware and startup tasks.
 *
 * This state is intentionally kept outside the server entry point so importing it
 * never starts the application or creates a circular dependency.
 */
export const serverState = {
	minimumAppVersion: '',
	isReady: false,
	requestTracker: [] as RequestTrackerType[],
};
