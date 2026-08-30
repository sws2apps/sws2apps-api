import { InstallationsList } from './installation-list.js';
import { loadInstallations } from './installations.repository.js';

export const initializeInstallations = async (): Promise<void> => {
	InstallationsList.replace(await loadInstallations());
};
