import { getFirestore } from 'firebase-admin/firestore';
import { decryptData } from '../utils/encryption-utils.js';
import { User } from './User.js';

const db = getFirestore(); //get default database

const getUsers = async () => {
	const userRef = db.collection('users');
	const snapshot = await userRef.get();

	const tmpUsers = [];

	snapshot.forEach((doc) => {
		tmpUsers.push({ id: doc.id, username: doc.data().about.name });
	});

	tmpUsers.sort((a, b) => {
		return a.username > b.username ? 1 : -1;
	});

	const finalResult = [];

	for (let i = 0; i < tmpUsers.length; i++) {
		const UserClass = new User();
		const user = await UserClass.loadDetails(tmpUsers[i].id);
		finalResult.push(user);
	}

	return finalResult;
};

class clsUsers {
	list = [];

	constructor() {}

	loadAll = async () => {
		this.list = await getUsers();
	};

	findUserByEmail = (email) => {
		return this.list.find((user) => user.user_uid === email);
	};

	findUserById = (id) => {
		return this.list.find((user) => user.id === id);
	};

	findUserByOTPCode = (code) => {
		try {
			let user;
			for (let i = 0; i < this.list.length; i++) {
				const item = this.list[i];
				const otpCode = item.pocket_oCode;

				const pocket_oCode = decryptData(otpCode);

				if (code === pocket_oCode) {
					user = item;
					break;
				}
			}

			return user;
		} catch (error) {
			throw new Error(error.message);
		}
	};

	create = async (user_uid, fullname, role) => {
		const data = {
			about: {
				name: fullname,
				role: role,
				user_uid,
			},
		};

		const addRef = await db.collection('users').add(data);
		const UserClass = new User();
		const userRef = UserClass.loadDetails(addRef.id);

		this.list.push(userRef);

		this.list.sort((a, b) => {
			return a.username > b.username ? 1 : -1;
		});
	};
}

export const Users = new clsUsers();
