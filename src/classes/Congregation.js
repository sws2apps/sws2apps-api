import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { decryptData, encryptData } from '../utils/encryption-utils.js';
import { Users } from './Users.js';

const db = getFirestore(); //get default database

export class Congregation {
	id;
	cong_name = '';
	cong_number = '';
	cong_persons = '';
	cong_members = [];
	cong_sourceMaterial = [];
	cong_schedule = [];
	cong_sourceMaterial_draft = [];
	cong_schedule_draft = [];
	cong_swsPocket = [];
	last_backup = {};

	constructor() { }

	loadDetails = async (id) => {
		const congRef = db.collection('congregations').doc(id);
		const congSnap = await congRef.get();

		const cong = new Congregation();

		cong.id = id;
		cong.cong_name = congSnap.data().cong_name;
		cong.cong_number = congSnap.data().cong_number;
		cong.last_backup = congSnap.data().last_backup;
		cong.cong_persons = congSnap.data().cong_persons || '';
		cong.cong_sourceMaterial = congSnap.data().cong_sourceMaterial || [];
		cong.cong_schedule = congSnap.data().cong_schedule || [];
		cong.cong_sourceMaterial_draft =
			congSnap.data().cong_sourceMaterial_draft || [];
		cong.cong_schedule_draft = congSnap.data().cong_schedule_draft || [];
		cong.cong_swsPocket = congSnap.data().cong_swsPocket || [];
		cong.members = [];

		const usersList = Users.list;
		for (let a = 0; a < usersList.length; a++) {
			if (usersList[a].global_role === 'vip' && usersList[a].cong_id === id) {
				cong.cong_members.push({
					id: usersList[a].id,
					user_uid: usersList[a].user_uid,
					name: usersList[a].username,
					role: usersList[a].cong_role,
					global_role: usersList[a].global_role,
					last_seen: usersList[a].last_seen,
				});
			}
		}

		if (congSnap.data().last_backup) {
			const fDate = Date.parse(
				congSnap.data().last_backup.date.toDate().toString()
			);
			cong.last_backup.date = fDate;

			const user = await Users.findUserById(congSnap.data().last_backup.by);
			cong.last_backup.by = user.username;
		}

		return cong;
	};

	isMember = (email) => {
		const user = Users.findUserByEmail(email);
		return user.cong_id === this.id;
	};

	saveBackup = async (
		cong_persons,
		cong_schedule,
		cong_sourceMaterial,
		cong_swsPocket,
		cong_settings,
		email
	) => {
		try {
			// encrypt cong_persons data
			const encryptedPersons = encryptData(cong_persons);

			const userInfo = Users.findUserByEmail(email);

			const data = {
				cong_persons: encryptedPersons,
				cong_schedule_draft: cong_schedule,
				cong_sourceMaterial_draft: cong_sourceMaterial,
				cong_swsPocket: cong_swsPocket,
				cong_settings: cong_settings,
				last_backup: {
					by: userInfo.id,
					date: new Date(),
				},
			};

			await db.collection('congregations').doc(id).set(data, { merge: true });

			this.cong_persons = encryptedPersons;
			this.cong_schedule_draft = cong_schedule;
			this.cong_sourceMaterial_draft = cong_sourceMaterial;
			this.cong_swsPocket = cong_swsPocket;
			this.cong_settings = cong_settings;
			this.last_backup = data.last_backup;
		} catch (error) {
			throw new Error(error.message);
		}
	};

	retrieveBackup = () => {
		try {
			// decrypt cong_persons data
			const decryptedPersons = JSON.parse(decryptData(this.cong_persons));

			const obj = {
				cong_persons: decryptedPersons,
				cong_schedule: cong_schedule_draft,
				cong_sourceMaterial: cong_sourceMaterial_draft,
				cong_swsPocket: cong_swsPocket,
				cong_settings: cong_settings,
			};

			return obj;
		} catch (error) {
			throw new Error(error.message);
		}
	};

	removeUser = async (id) => {
		try {
			return this.cong_members.filter((member) => member.id !== id);
		} catch (error) {
			throw new Error(error.message);
		}
	};
}
