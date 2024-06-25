import { getFirestore } from 'firebase-admin/firestore';
import { User } from '../classes/User.js';

const db = getFirestore();

export const dbFetchUsers = async () => {
	const userRef = db.collection('users_v3');
	const snapshot = await userRef.get();

	const items: string[] = [];

	snapshot.forEach((doc) => {
		items.push(doc.id);
	});

	const finalResult: User[] = [];

	for (let i = 0; i < items.length; i++) {
		const UserNew = new User(items[i]);
		await UserNew.loadDetails();
		finalResult.push(UserNew);
	}

	return finalResult;
};

// export const userAccountChecker = async (id) => {
// 	const user = await users.findUserById(id);
// 	const userFound = user ? true : false;

// 	return { isParamsValid: id !== undefined, userFound, user };
// };
