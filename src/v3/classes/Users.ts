import { PocketNewParams, RequestPasswordLessLinkParams, UserNewParams } from '../definition/user.js';
import { User } from './User.js';
import { CongregationsList } from './Congregations.js';
import { createPasswordLessLink, createPocketUser, createUser, loadAllUsers } from '../services/firebase/users.js';
import { deleteFileFromStorage } from '../services/firebase/storage_utils.js';

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
		return user;
	}

	async load() {
		this.list = await loadAllUsers();
		this.#sort();
	}

	findByEmail(email: string) {
		const found = this.list.find((user) => user.profile.email === email);
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

	async generatePasswordLessLink(params: RequestPasswordLessLinkParams) {
		const link = await createPasswordLessLink(params);
		return link;
	}

	async createPocket(params: PocketNewParams) {
		const id = await createPocketUser(params);

		const user = await this.#add(id);
		return user;
	}

	async delete(id: string) {
		await deleteFileFromStorage({ type: 'user', path: id });

		const user = this.findById(id);
		this.list = this.list.filter((record) => record.id !== id);

		if (user?.profile.congregation?.id) {
			const cong = CongregationsList.findById(user.profile.congregation.id);

			if (cong) {
				cong.reloadMembers();
			}
		}
	}
}

export const UsersList = new Users();
