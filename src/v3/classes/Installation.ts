import { AppInstallation, InstallationItem } from '../definition/installations.js';
import { loadInstallation, setInstallation } from '../services/firebase/installations.js';

class _Installation {
	linked: AppInstallation['linked'];
	pending: AppInstallation['pending'];
	list: InstallationItem[];

	constructor() {
		this.linked = [];
		this.pending = [];
		this.list = [];
	}

	async load() {
		const data = await loadInstallation();

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
		await setInstallation({ linked: this.linked, pending: this.pending });
	}
}

export const Installation = new _Installation();
