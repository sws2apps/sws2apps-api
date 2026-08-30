import type { AppInstallation, InstallationItem } from './installation.js';
import { InstallationsList } from './installation-list.js';
import { saveInstallations } from './installations.repository.js';

type InstallationRegistrationResult = AppInstallation & {
	changed: boolean;
};

export const prepareInstallationRegistration = (
	installations: AppInstallation,
	existingInstallation: InstallationItem | undefined,
	installationId: string,
	userId: string | undefined,
	registeredAt: string,
): InstallationRegistrationResult => {
	const linked = structuredClone(installations.linked);
	let pending = structuredClone(installations.pending);
	const registration = { id: installationId, registered: registeredAt };

	if (!existingInstallation && userId) {
		linked.push({ user: userId, installations: [registration] });
		return { linked, pending, changed: true };
	}

	if (!existingInstallation) {
		pending.push(registration);
		return { linked, pending, changed: true };
	}

	if (existingInstallation.status === 'pending' && userId) {
		pending = pending.filter((record) => record.id !== installationId);
		linked.push({ user: userId, installations: [registration] });
		return { linked, pending, changed: true };
	}

	return { linked, pending, changed: false };
};

export const registerInstallation = async (
	installationId: string,
	userId: string | undefined,
): Promise<void> => {
	const registration = prepareInstallationRegistration(
		{
			linked: InstallationsList.linked,
			pending: InstallationsList.pending,
		},
		InstallationsList.find(installationId),
		installationId,
		userId,
		new Date().toISOString(),
	);

	if (!registration.changed) return;

	InstallationsList.linked = registration.linked;
	InstallationsList.pending = registration.pending;

	await saveInstallations({
		linked: registration.linked,
		pending: registration.pending,
	});
};
