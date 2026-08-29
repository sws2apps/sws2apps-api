import {
	AppInstallation,
	InstallationItem,
} from './installation.js';
import {
	loadInstallations,
	saveInstallations,
} from './installations.repository.js';

export class Installation {
	linked: AppInstallation['linked'];
	pending: AppInstallation['pending'];
	list: InstallationItem[];

	constructor() {
		this.linked = [];
		this.pending = [];
		this.list = [];
	}

	async load() {
		const data = await loadInstallations();

		this.linked = data.linked;
		this.pending = data.pending;
		this.list = this.#allInstallations();
	}

	#allInstallations() {
		const result: InstallationItem[] = [];

		for (const user of this.linked) {
			for (const installation of user.installations) {
				result.push({ id: installation.id, registered: installation.registered, status: 'linked', user: user.user });
			}
		}

		for (const installation of this.pending) {
			result.push({ id: installation.id, registered: installation.registered, status: 'pending' });
		}

		return result;
	}

	find(installation: string) {
		return this.list.find((record) => record.id === installation);
	}

	async save() {
		await saveInstallations({ linked: this.linked, pending: this.pending });
	}
}

export const InstallationsList = new Installation();
