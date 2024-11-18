import { getFirestore } from 'firebase-admin/firestore';
import { User } from '../classes/User.js';
import { users } from '../classes/Users.js';

const db = getFirestore();

export const dbFetchUsers = async () => {
	const userRef = db.collection('users_v2');
	const snapshot = await userRef.get();

	const items = [];

	snapshot.forEach((doc) => {
		items.push(doc.id);
	});

	const finalResult = [];

	for (let i = 0; i < items.length; i++) {
		const UserClass = new User(items[i]);
		const user = await UserClass.loadDetails();
		finalResult.push(user);
	}

	return finalResult;
};

export const userAccountChecker = async (id) => {
	const user = await users.findUserById(id);
	const userFound = user ? true : false;

	return { isParamsValid: id !== undefined, userFound, user };
};
