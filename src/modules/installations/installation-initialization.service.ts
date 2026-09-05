import { InstallationsList } from './installation-list.js';
import { loadInstallations } from './installations.repository.js';
import type { AppInstallation } from './installation.js';

export type InstallationInitializationOperations = {
	loadInstallationState: () => Promise<AppInstallation>;
	replaceInstallations: (installations: AppInstallation) => void;
};

const defaultInitializationOperations: InstallationInitializationOperations = {
	loadInstallationState: () => loadInstallations(),
	replaceInstallations: (installations) => InstallationsList.replace(installations),
};

export const initializeInstallations = async (
	operations: Partial<InstallationInitializationOperations> = {},
): Promise<void> => {
	const initialization = {
		...defaultInitializationOperations,
		...operations,
	};
	const installations = await initialization.loadInstallationState();

	initialization.replaceInstallations(installations);
};
