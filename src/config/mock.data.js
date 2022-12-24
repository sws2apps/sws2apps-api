import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// create admin user
export const createAdmin = async () => {
	try {
		const userData = {
			email: 'admin@gmail.com',
			emailVerified: true,
			password: 'admin1234567890',
			disabled: false,
		};

		await getAuth().createUser(userData);

		const data = {
			about: {
				name: 'admin',
				role: 'admin',
				user_uid: 'admin@gmail.com',
				mfaEnabled: true,
			},
		};

		await db.collection('users').add(data);
	} catch {}
};
