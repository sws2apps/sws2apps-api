import { User } from './user.js';
import {
	loadUserIdentities,
} from './user-identity.service.js';
import { loadAllUsers } from './users.repository.js';

class Users {
	list: User[];

	constructor() {
		this.list = [];
	}

	#sort() {
		this.list.sort((a, b) => a.profile.lastname.value.localeCompare(b.profile.lastname.value));
	}

	add(user: User) {
		this.list.push(user);
		this.#sort();
	}

	async load() {
		this.list = await loadAllUsers();
		await loadUserIdentities(this.list);
		this.#sort();
	}

	findByEmail(email: string) {
		const found = this.list.find((user) => user.email === email);
		return found;
	}

	findById(id: string) {
		const found = this.list.find((user) => user.id === id);
		return found;
	}

	findByLocalUid(local_uid: string) {
		const found = this.list.find((user) => user.profile.congregation?.user_local_uid === local_uid);
		return found;
	}

	findByAuthUid(auth_uid: string) {
		const found = this.list.find((user) => user.profile.auth_uid === auth_uid);
		return found;
	}

	findByVisitorId(visitorId: string) {
		const user = this.list.find((record) => record.sessions.find((session) => session.visitorid === visitorId));
		return user;
	}

	removeById(id: string) {
		this.list = this.list.filter((record) => record.id !== id);
	}
}

export const UsersList = new Users();
