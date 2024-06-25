import { dbFetchUsers } from '../utils/user_utils.js';
import { dbUserCreate, dbUserGeneratePasswordLessLink } from '../services/firebase/users.js';
import { RequestPasswordLessLinkParams, UserNewParams } from '../denifition/user.js';
import { User } from './User.js';

class Users {
	list: User[];

	constructor() {
		this.list = [];
	}

	#sort() {
		this.list.sort((a, b) => {
			return a.lastname.value > b.lastname.value ? 1 : -1;
		});
	}

	async #add(id: string) {
		const NewUser = new User(id);
		await NewUser.loadDetails();
		this.list.push(NewUser);
		this.#sort();
		return NewUser;
	}

	async load() {
		this.list = await dbFetchUsers();
		this.#sort();
	}

	findByEmail(email: string) {
		const found = this.list.find((user) => user.user_email === email);
		return found;
	}

	findById(id: string) {
		const found = this.list.find((user) => user.id === id);
		return found;
	}

	findByLocalUid(local_uid: string) {
		const found = this.list.find((user) => user.user_local_uid === local_uid);
		return found;
	}

	findByAuthUid(auth_uid: string) {
		const found = this.list.find((user) => user.auth_uid === auth_uid);
		return found;
	}

	findVisitorId(visitorId: string) {
		const user = this.list.find((record) => record.sessions!.find((session) => session.visitorid === visitorId));
		return user;
	}

	async create(params: UserNewParams) {
		const id = await dbUserCreate(params);

		const NewUser = await this.#add(id);
		return NewUser;
	}

	async generatePasswordLessLink(params: RequestPasswordLessLinkParams) {
		const link = await dbUserGeneratePasswordLessLink(params);

		return link;
	}
}

export const UsersList = new Users();
