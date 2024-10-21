import { PocketNewParams, RequestPasswordLessLinkParams, UserNewParams } from '../definition/user.js';
import { User } from './User.js';
import { CongregationsList } from './Congregations.js';
import { createPocketUser, createUser, deleteAuthUser, loadAllUsers } from '../services/firebase/users.js';
import { deleteFileFromStorage } from '../services/firebase/storage_utils.js';
import { getAuth } from 'firebase-admin/auth';

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

	async generatePasswordLessLink({ email, origin }: RequestPasswordLessLinkParams) {
		const localUser = UsersList.findByEmail(email);

		if (!localUser) {
			const results = await getAuth().getUsers([{ email }]);

			if (results.users.length === 0) {
				await getAuth().createUser({ email });
			}
		}

		const user = await getAuth().getUserByEmail(email);
		const token = await getAuth().createCustomToken(user.uid);

		const link = `${origin}/#/?code=${token}`;
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

		if (user?.profile.auth_uid) {
			await deleteAuthUser(user.profile.auth_uid);
		}

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
