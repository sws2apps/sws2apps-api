import type { AppInstallation, InstallationItem } from './installation.js';

import { InstallationsList } from './installation-list.js';
import { updateInstallationsFile } from './installations.repository.js';

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

type RegistrationOperations = {
	updateInstallations: typeof updateInstallationsFile;
};

const defaultRegistrationOperations: RegistrationOperations = {
	updateInstallations: (update) => updateInstallationsFile(update),
};

const findExistingInstallation = (
	installations: AppInstallation,
	installationId: string,
): InstallationItem | undefined => {
	for (const user of installations.linked) {
		const installation = user.installations.find((record) => record.id === installationId);
		if (installation) {
			return {
				id: installation.id,
				registered: installation.registered,
				status: 'linked',
				user: user.user,
			};
		}
	}

	const pending = installations.pending.find((record) => record.id === installationId);
	if (pending) {
		return { id: pending.id, registered: pending.registered, status: 'pending' };
	}

	return undefined;
};

let registrationQueue: Promise<void> = Promise.resolve();

export const registerInstallation = async (
	installationId: string,
	userId: string | undefined,
	operations: Partial<RegistrationOperations> = {},
): Promise<void> => {
	const registration = {
		...defaultRegistrationOperations,
		...operations,
	};

	const previous = registrationQueue;
	let releasePrevious!: () => void;
	registrationQueue = new Promise((resolve) => {
		releasePrevious = resolve;
	});

	await previous;

	try {
		const next = await registration.updateInstallations(async (current) => {
			const existing = findExistingInstallation(current, installationId);
			const nextState = prepareInstallationRegistration(
				current,
				existing,
				installationId,
				userId,
				new Date().toISOString(),
			);

			if (!nextState.changed) {
				return { next: current, result: current };
			}

			const installations: AppInstallation = {
				linked: nextState.linked,
				pending: nextState.pending,
			};

			return { next: installations, result: installations };
		});

		InstallationsList.replace(next);
	} finally {
		releasePrevious();
	}
};
