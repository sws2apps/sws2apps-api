import dayjs from 'dayjs';
import randomstring from 'randomstring';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { decryptData, encryptData } from '../utils/encryption-utils.js';
import { users } from './Users.js';

const db = getFirestore(); //get default database

export class Congregation {
	constructor(id) {
		this.id = id;
		this.cong_name = '';
		this.cong_number = '';
		this.cong_persons = '';
		this.cong_members = [];
		this.cong_sourceMaterial = [];
		this.cong_schedule = [];
		this.cong_sourceMaterial_draft = [];
		this.cong_schedule_draft = [];
		this.cong_swsPocket = [];
		this.cong_settings = [];
		this.last_backup = {};
	}
}

Congregation.prototype.loadDetails = async function () {
	const congRef = db.collection('congregations').doc(this.id);
	const congSnap = await congRef.get();

	this.cong_name = congSnap.data().cong_name;
	this.cong_number = congSnap.data().cong_number;
	this.last_backup = congSnap.data().last_backup;
	this.cong_persons = congSnap.data().cong_persons || '';
	this.cong_sourceMaterial = congSnap.data().cong_sourceMaterial || [];
	this.cong_schedule = congSnap.data().cong_schedule || [];
	this.cong_sourceMaterial_draft = congSnap.data().cong_sourceMaterial_draft || [];
	this.cong_schedule_draft = congSnap.data().cong_schedule_draft || [];
	this.cong_swsPocket = congSnap.data().cong_swsPocket || [];
	this.cong_settings = congSnap.data().cong_settings || [];
	this.members = [];

	users.list.forEach((user) => {
		if (user.cong_id === this.id) {
			const otpCode = user.pocket_oCode;
			let pocket_oCode = '';

			if (otpCode && otpCode !== '') {
				pocket_oCode = decryptData(otpCode);
			}

			this.cong_members.push({ ...user, pocket_oCode: pocket_oCode });
		}
	});

	if (congSnap.data().last_backup) {
		const fDate = dayjs.unix(congSnap.data().last_backup.date._seconds).$d;
		this.last_backup.date = fDate;

		const user = users.findUserById(congSnap.data().last_backup.by);
		this.last_backup.by = user?.username || '';
	}
};

Congregation.prototype.reloadMembers = async function () {
	const members = [];
	users.list.forEach((user) => {
		if (user.cong_id === this.id) {
			const otpCode = user.pocket_oCode;
			let pocket_oCode = '';

			if (otpCode && otpCode !== '') {
				pocket_oCode = decryptData(otpCode);
			}

			members.push({ ...user, pocket_oCode: pocket_oCode });
		}
	});
	this.cong_members = members;
};

Congregation.prototype.isMember = function (email) {
	const user = users.findUserByEmail(email);
	return user.cong_id === this.id;
};

Congregation.prototype.saveBackup = async function (
	cong_persons,
	cong_schedule,
	cong_sourceMaterial,
	cong_swsPocket,
	cong_settings,
	email
) {
	try {
		// encrypt cong_persons data
		const encryptedPersons = encryptData(cong_persons);

		const userInfo = users.findUserByEmail(email);

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

		await db.collection('congregations').doc(this.id).set(data, { merge: true });

		this.cong_persons = encryptedPersons;
		this.cong_schedule_draft = cong_schedule;
		this.cong_sourceMaterial_draft = cong_sourceMaterial;
		this.cong_swsPocket = cong_swsPocket;
		this.cong_settings = cong_settings;
		this.last_backup = {
			by: userInfo.username,
			date: data.last_backup.date,
		};
	} catch (error) {
		throw new Error(error.message);
	}
};

Congregation.prototype.retrieveBackup = function () {
	try {
		// decrypt cong_persons data
		const decryptedPersons = JSON.parse(decryptData(this.cong_persons));

		return {
			cong_persons: decryptedPersons,
			cong_schedule: this.cong_schedule_draft,
			cong_sourceMaterial: this.cong_sourceMaterial_draft,
			cong_swsPocket: this.cong_swsPocket,
			cong_settings: this.cong_settings,
		};
	} catch (error) {
		throw new Error(error.message);
	}
};

Congregation.prototype.removeUser = async function (userId) {
	await db.collection('users').doc(userId).update({ congregation: FieldValue.delete() });

	// update users list
	const user = users.findUserById(userId);
	user.cong_id = '';
	user.cong_name = '';
	user.cong_number = '';
	user.cong_role = [];

	// update congregation members
	this.reloadMembers();
};

Congregation.prototype.addUser = async function (userId, role) {
	const newRole = role || [];
	const data = { congregation: { id: this.id, role: newRole } };
	await db.collection('users').doc(userId).set(data, { merge: true });

	// update users list
	const user = users.findUserById(userId);
	user.cong_id = this.id;
	user.cong_name = this.cong_name;
	user.cong_number = this.cong_number;

	// update congregation members
	this.reloadMembers();

	return user;
};

Congregation.prototype.updateUserRole = async function (userId, userRole) {
	const data = { congregation: { id: this.id, role: userRole } };
	await db.collection('users').doc(userId).set(data, { merge: true });

	// update users list
	const user = users.findUserById(userId);
	user.cong_role = userRole;

	// update congregation members
	this.reloadMembers();
};

Congregation.prototype.createPocketUser = async function (pocketName, pocketId) {
	const code = randomstring.generate(10).toUpperCase();
	const secureCode = encryptData(code);

	const ref = await db.collection('users').add({
		about: { name: pocketName, role: 'pocket' },
		congregation: {
			id: this.id,
			local_id: pocketId,
			devices: [],
			oCode: secureCode,
			pocket_role: [],
			pocket_members: [],
		},
	});

	// update users list
	await users.addNew(ref.id);

	// update congregation members
	this.reloadMembers();
};

Congregation.prototype.deletePocketUser = async function (userId) {
	await users.delete(userId);

	// update congregation members
	this.reloadMembers();
};

Congregation.prototype.sendPocketSchedule = async function (data) {
	const currentSchedule = this.cong_schedule;
	const currentSource = this.cong_sourceMaterial;

	// remove expired schedule and source (> 3 months)
	const currentDate = new Date().getTime();
	const validSchedule = currentSchedule.midweekMeeting?.filter((schedule) => schedule.expiredDate > currentDate) || [];
	const validSource = currentSource.midweekMeeting?.filter((source) => source.expiredDate > currentDate) || [];

	let newStudentsSchedule = validSchedule;
	let newStudentsSource = validSource;

	for (let i = 0; i < data.length; i++) {
		const schedule = data[i];

		const { id, month, year, schedules, sources } = schedule;

		const lastDate = new Date(year, month + 1, 0);
		let expiredDate = new Date();
		expiredDate.setDate(lastDate.getDate() + 90);
		const expiredTime = expiredDate.getTime();

		const objSchedule = {
			expiredDate: expiredTime,
			id,
			modifiedDate: new Date().getTime(),
			month,
			schedules,
			year,
		};
		const objSource = {
			expiredDate: expiredTime,

			id,
			modifiedDate: new Date().getTime(),
			month,

			sources,
			year,
		};

		newStudentsSchedule = newStudentsSchedule.filter((schedule) => schedule.id !== objSchedule.id);
		newStudentsSchedule.push(objSchedule);

		newStudentsSource = newStudentsSource.filter((source) => source.id !== objSource.id);
		newStudentsSource.push(objSource);
	}

	const newSchedule = { midweekMeeting: newStudentsSchedule };
	const newSource = { midweekMeeting: newStudentsSource };

	await db.collection('congregations').doc(this.id).update({
		cong_schedule: newSchedule,
		cong_sourceMaterial: newSource,
	});

	this.cong_schedule = newSchedule;
	this.cong_sourceMaterial = newSource;
};
