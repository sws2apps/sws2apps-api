import dayjs from 'dayjs';
import randomstring from 'randomstring';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { decryptData, encryptData } from '../utils/encryption-utils.js';
import { users } from './Users.js';

const db = getFirestore(); //get default database

export class Congregation {
	constructor(id) {
		this.id = id;
		this.country_code = '';
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

	this.country_code = congSnap.data().country_code;
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

Congregation.prototype.updateInfo = async function (congInfo) {
	congInfo.cong_number = congInfo.cong_number.toString();
	await db.collection('congregations').doc(this.id).set(congInfo, { merge: true });
	this.country_code = congInfo.country_code;
	this.cong_name = congInfo.cong_name;
	this.cong_number = congInfo.cong_number;
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
	cong_deleted,
	cong_schedule,
	cong_sourceMaterial,
	cong_swsPocket,
	cong_settings,
	email
) {
	try {
		let finalPersons = [];

		// new backup persons
		if (this.cong_persons === '') {
			finalPersons = cong_persons;
		}

		// updated persons
		if (this.cong_persons !== '') {
			const decryptedPersons = JSON.parse(decryptData(this.cong_persons));

			// handle modified person record
			decryptedPersons.forEach((oldPerson) => {
				const newPerson = cong_persons.find((person) => person.person_uid === oldPerson.person_uid);
				if (newPerson) {
					const oldChanges = oldPerson.changes;
					const newChanges = newPerson.changes;

					const arrayFields = [
						{ name: 'assignments', id: 'assignmentId' },
						{ name: 'timeAway', id: 'timeAwayId' },
					];

					if (newChanges) {
						// handle non-assignments and non-time away changes
						newChanges.forEach((change) => {
							if (arrayFields.findIndex((field) => field.name === change.field) === -1) {
								let isChanged = false;

								const oldChange = oldChanges.find((old) => old.field === change.field);
								const originalDate = oldChange?.date || undefined;

								if (!oldChange) {
									isChanged = true;
								}

								if (originalDate) {
									const dateA = new Date(originalDate);
									const dateB = new Date(change.date);

									if (dateB > dateA) {
										isChanged = true;
									}
								}

								if (isChanged) {
									oldPerson[change.field] = change.value;

									if (oldPerson.changes) {
										const findIndex = oldPerson.changes.findIndex((item) => item.field === change.field) || -1;
										if (findIndex !== -1) oldPerson.changes.splice(findIndex, 1);
									}

									if (!oldPerson.changes) {
										oldPerson.changes = [];
									}

									oldPerson.changes.push(change);
								}
							}
						});

						// handle assignments and time away changes
						newChanges.forEach((change) => {
							const foundArray = arrayFields.find((field) => field.name === change.field);
							if (foundArray) {
								// handle deleted item
								if (change.isDeleted) {
									const toBeDeleted = oldPerson[change.field].findIndex(
										(item) => item[foundArray.id] === change.value[foundArray.id]
									);
									if (toBeDeleted !== -1) oldPerson[change.field].splice(toBeDeleted, 1);
								}

								// handle added item
								if (change.isAdded) {
									oldPerson[change.field].push(change.value);
									if (!oldPerson.changes) oldPerson.changes = [];
									oldPerson.changes.push(change);
								}

								// handle modified item
								if (change.isModified) {
									const toBeModified = oldPerson[change.field].findIndex(
										(item) => item[foundArray.id] === change.value[foundArray.id]
									);

									if (toBeModified !== -1) oldPerson[change.field].splice(toBeModified, 1);
									oldPerson[change.field].push(change.value);
								}

								// update changes
								if (change.isDeleted || change.isModified) {
									if (!oldPerson.changes) oldPerson.changes = [];
									const findIndex = oldPerson.changes.findIndex(
										(item) => item.value[foundArray.id] === change.value[foundArray.id]
									);
									if (findIndex !== -1) oldPerson.changes.splice(findIndex, 1);
									oldPerson.changes.push(change);
								}
							}
						});
					}
				}

				finalPersons.push(oldPerson);
			});

			// handle new person record
			cong_persons.forEach((newPerson) => {
				const oldPerson = decryptedPersons.find((person) => person.person_uid === newPerson.person_uid);
				if (!oldPerson) {
					finalPersons.push(newPerson);
				}
			});

			// handle deleted person record
			cong_deleted.forEach((deleted) => {
				const foundPerson = finalPersons.findIndex((person) => person.person_uid === deleted.ref);
				if (foundPerson !== -1) finalPersons.splice(foundPerson, 1);
			});
		}

		// encrypt cong_persons data
		const encryptedPersons = encryptData(finalPersons);

		let finalSchedule = [];

		// new backup schedule
		if (this.cong_schedule_draft.length === 0) {
			finalSchedule = cong_schedule;
		}

		// updated schedule
		if (this.cong_schedule_draft.length > 0) {
			// handle modified schedule
			this.cong_schedule_draft.forEach((oldSchedule) => {
				const newSchedule = cong_schedule.find((schedule) => schedule.weekOf === oldSchedule.weekOf);
				if (newSchedule) {
					const oldChanges = oldSchedule.changes;
					const newChanges = newSchedule.changes;

					if (newChanges) {
						newChanges.forEach((change) => {
							let isChanged = false;

							const oldChange = oldChanges.find((old) => old.field === change.field);
							const originalDate = oldChange?.date || undefined;

							if (!oldChange) {
								isChanged = true;
							}

							if (originalDate) {
								const dateA = new Date(originalDate);
								const dateB = new Date(change.date);

								if (dateB > dateA) {
									isChanged = true;
								}
							}

							if (isChanged) {
								oldSchedule[change.field] = change.value;

								if (oldSchedule.changes) {
									const findIndex = oldSchedule.changes.findIndex((item) => item.field === change.field) || -1;
									if (findIndex !== -1) oldSchedule.changes.splice(findIndex, 1);
								}

								if (!oldSchedule.changes) {
									oldSchedule.changes = [];
								}

								oldSchedule.changes.push(change);
							}
						});
					}
				}

				finalSchedule.push(oldSchedule);
			});

			// handle new schedule record
			cong_schedule.forEach((newSchedule) => {
				const oldSchedule = this.cong_schedule_draft.find((schedule) => schedule.weekOf === newSchedule.weekOf);
				if (!oldSchedule) {
					finalSchedule.push(newSchedule);
				}
			});
		}

		let finalSource = [];
		cong_sourceMaterial.forEach((newSource) => {
			const oldSource = this.cong_sourceMaterial_draft.find((source) => source.weekOf === newSource.weekOf);

			if (oldSource) {
				// restore keepOverride if qualified
				const newKeepOverride = newSource.keepOverride || undefined;
				const oldKeepOverride = oldSource ? oldSource.keepOverride : undefined;
				let isRestore = false;

				if (!newKeepOverride) {
					isRestore = true;
				}

				if (newKeepOverride && oldKeepOverride) {
					const oldDate = new Date(oldKeepOverride);
					const newDate = new Date(newKeepOverride);

					if (oldDate > newDate) {
						isRestore = true;
					}
				}

				if (isRestore) {
					for (const [key, value] of Object.entries(oldSource)) {
						if (key.indexOf('_override')) {
							if (value) newSource[key] = value;
						}
					}
				}
			}

			finalSource.push(newSource);
		});

		const userInfo = users.findUserByEmail(email);

		const data = {
			cong_persons: encryptedPersons,
			cong_schedule_draft: finalSchedule,
			cong_sourceMaterial_draft: finalSource,
			cong_swsPocket: cong_swsPocket,
			cong_settings: cong_settings,
			last_backup: {
				by: userInfo.id,
				date: new Date(),
			},
		};

		await db.collection('congregations').doc(this.id).set(data, { merge: true });

		this.cong_persons = encryptedPersons;
		this.cong_schedule_draft = finalSchedule;
		this.cong_sourceMaterial_draft = finalSource;
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
	user.cong_role = newRole;

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
	const secureCode = encryptData(`${this.country_code}${this.cong_number}-${code}`);

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

Congregation.prototype.sendPocketSchedule = async function (cong_schedules, cong_settings) {
	const currentSchedule = this.cong_schedule;
	const currentSource = this.cong_sourceMaterial;

	// remove expired schedule and source (> 3 months)
	const currentDate = new Date().getTime();
	const validSchedule = currentSchedule.midweekMeeting?.filter((schedule) => schedule.expiredDate > currentDate) || [];
	const validSource = currentSource.midweekMeeting?.filter((source) => source.expiredDate > currentDate) || [];

	let newStudentsSchedule = validSchedule;
	let newStudentsSource = validSource;

	for (let i = 0; i < cong_schedules.length; i++) {
		const schedule = cong_schedules[i];

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
		cong_settings,
	});

	this.cong_schedule = newSchedule;
	this.cong_sourceMaterial = newSource;
	this.cong_settings = cong_settings;
};
