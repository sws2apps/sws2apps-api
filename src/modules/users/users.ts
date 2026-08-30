import type {
	PocketNewParams,
	UserNewParams,
} from './user.types.js';
import { User } from './user.js';
import {
	createPocketUser,
	createUser,
	loadAllUsers,
} from './users.repository.js';

class Users {
	list: User[];

	constructor() {
		this.list = [];
	}

	#sort() {
		this.list.sort((a, b) => a.profile.lastname.value.localeCompare(b.profile.lastname.value));
	}

	async #add(id: string) {
		const user = new User(id);
		await user.loadDetails();
		this.list.push(user);
		this.#sort();

		return this.list.find((record) => record.id === id)!;
	}

	async load() {
		this.list = await loadAllUsers();
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

	async create(params: UserNewParams) {
		const id = await createUser(params);

		const user = await this.#add(id);
		return user;
	}

	async createPocket(params: PocketNewParams) {
		const id = await createPocketUser(params);

		const user = await this.#add(id);
		return user;
	}

	removeById(id: string) {
		this.list = this.list.filter((record) => record.id !== id);
	}
}

export const UsersList = new Users();
