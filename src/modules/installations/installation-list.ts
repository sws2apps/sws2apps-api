import {
	AppInstallation,
	InstallationItem,
} from './installation.js';

export class Installation {
	linked: AppInstallation['linked'];
	pending: AppInstallation['pending'];
	list: InstallationItem[];

	constructor() {
		this.linked = [];
		this.pending = [];
		this.list = [];
	}

	replace(data: AppInstallation) {
		this.linked = data.linked;
		this.pending = data.pending;
		this.list = this.#allInstallations();
	}

	get linkedCount() {
		return this.linked.reduce((total, user) => total + user.installations.length, 0);
	}

	#allInstallations() {
		const result: InstallationItem[] = [];

		for (const user of this.linked) {
			for (const installation of user.installations) {
				result.push({ id: installation.id, last_handshake: installation.last_handshake, status: 'linked', user: user.user });
			}
		}

		for (const installation of this.pending) {
			result.push({ id: installation.id, last_handshake: installation.last_handshake, status: 'pending' });
		}

		return result;
	}

	find(installation: string) {
		return this.list.find((record) => record.id === installation);
	}

}

export const InstallationsList = new Installation();
