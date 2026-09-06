import { isTimestampOnOrAfter, subtractUtcMonths } from '#domain/time/retention-period.js';
import { LogLevel } from '@logtail/types';
import { logger } from '#platform/logging/logger.js';
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
	lastHandshake: string,
): InstallationRegistrationResult => {
	const linked = structuredClone(installations.linked);
	let pending = structuredClone(installations.pending);
	const registration = { id: installationId, last_handshake: lastHandshake };

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
				last_handshake: installation.last_handshake,
				status: 'linked',
				user: user.user,
			};
		}
	}

	const pending = installations.pending.find((record) => record.id === installationId);
	if (pending) {
		return { id: pending.id, last_handshake: pending.last_handshake, status: 'pending' };
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

export const touchInstallation = async (
	installationId: string,
	operations: Partial<RegistrationOperations> = {},
): Promise<void> => {
	const registration = {
		...defaultRegistrationOperations,
		...operations,
	};

	const flatItem = InstallationsList.find(installationId);
	if (!flatItem) return;

	const cutoff = subtractUtcMonths(new Date(), 3);
	if (isTimestampOnOrAfter(flatItem.last_handshake, cutoff)) return;

	const previous = registrationQueue;
	let releasePrevious!: () => void;
	registrationQueue = new Promise((resolve) => {
		releasePrevious = resolve;
	});

	await previous;

	try {
		const next = await registration.updateInstallations(async (current) => {
			const existing = findExistingInstallation(current, installationId);

			if (!existing) {
				return { next: current, result: current };
			}

			const now = new Date().toISOString();

			if (existing.status === 'pending') {
				const updatedPending = current.pending.map((record) =>
					record.id === installationId ? { ...record, last_handshake: now } : record,
				);
				const updated = { ...current, pending: updatedPending };
				return { next: updated, result: updated };
			}

			const updatedLinked = current.linked.map((user) => ({
				...user,
				user: user.user,
				installations: user.installations.map((record) =>
					record.id === installationId ? { ...record, last_handshake: now } : record,
				),
			}));
			const updated = { ...current, linked: updatedLinked };
			return { next: updated, result: updated };
		});

		InstallationsList.replace(next);
	} catch {
		logger(LogLevel.Warn, 'failed to refresh application installation timestamp', {
			installationId,
		});
	} finally {
		releasePrevious();
	}
};
