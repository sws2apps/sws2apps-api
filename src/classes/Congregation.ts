import {
	dbCongregationLoadDetails,
	dbCongregationSaveBackup,
	dbCongregationSaveEncryptionKey,
} from '../services/firebase/congregations.js';
import { User } from './User.js';
import { UsersList } from './Users.js';

export class Congregation {
	id: string;
	country_code: string;
	cong_name: string;
	cong_number: string;
	cong_members: User[];
	cong_settings: [];
	cong_encryption: string;
	last_backup: string | undefined;

	constructor(id: string) {
		this.id = id;
		this.country_code = '';
		this.cong_name = '';
		this.cong_number = '';
		this.cong_members = [];
		this.cong_settings = [];
		this.last_backup = undefined;
		this.cong_encryption = '';
	}

	async loadDetails() {
		const data = await dbCongregationLoadDetails(this.id);

		this.cong_encryption = data.cong_encryption;
		this.cong_name = data.cong_name;
		this.cong_number = data.cong_number;
		this.country_code = data.country_code;
		this.last_backup = data.last_backup;

		this.reloadMembers();
	}

	async saveBackup() {
		this.last_backup = await dbCongregationSaveBackup(this.id);
	}

	async saveEncryptionKey(key: string) {
		await dbCongregationSaveEncryptionKey(this.id, key);
		this.cong_encryption = key;
	}

	hasMember(auth_uid: string) {
		const user = UsersList.findByAuthUid(auth_uid);
		return user!.cong_id === this.id;
	}

	reloadMembers() {
		const cong_members: User[] = [];

		for (const user of UsersList.list) {
			if (user.cong_id === this.id) {
				cong_members.push(user);
			}
		}

		this.cong_members = cong_members;
	}
}
