import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import dayjs from 'dayjs';
import randomstring from 'randomstring';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { decryptData, encryptData } from '../utils/encryption-utils.js';
import { users } from './Users.js';
import { getOldestWeekDate, getWeekDate } from '../utils/date.js';

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
	this.cong_persons = '';
	this.cong_sourceMaterial_draft = [];
	this.cong_schedule_draft = [];
	this.cong_sourceMaterial = [];
	this.cong_schedule = [];

	if (!existsSync(`./cong_backup`)) await mkdir(`./cong_backup`);
	if (!existsSync(`./cong_backup/${this.id}`)) await mkdir(`./cong_backup/${this.id}`);

	const storageBucket = getStorage().bucket();

	const filePerson = await storageBucket.file(`${this.id}/persons.txt`);
	const [filePersonExist] = await filePerson.exists();
	if (filePersonExist) {
		await filePerson.download({ destination: `./cong_backup/${this.id}/persons.txt` });
		const tempPersons = await readFile(`./cong_backup/${this.id}/persons.txt`);
		this.cong_persons = tempPersons.toString();
	}

	const fileSchedule = await storageBucket.file(`${this.id}/schedules.txt`);
	const [fileScheduleExist] = await fileSchedule.exists();
	if (fileScheduleExist) {
		await fileSchedule.download({ destination: `./cong_backup/${this.id}/schedules.txt` });
		const tempSchedules = await readFile(`./cong_backup/${this.id}/schedules.txt`);
		this.cong_schedule_draft = JSON.parse(tempSchedules);
	}

	const fileSource = await storageBucket.file(`${this.id}/sources.txt`);
	const [fileSourceExist] = await fileSource.exists();
	if (fileSourceExist) {
		await fileSource.download({ destination: `./cong_backup/${this.id}/sources.txt` });
		const tempSources = await readFile(`./cong_backup/${this.id}/sources.txt`);
		this.cong_sourceMaterial_draft = JSON.parse(tempSources);
	}

	const filePocketSchedule = await storageBucket.file(`${this.id}/pocket-schedules.txt`);
	const [filePocketScheduleExist] = await filePocketSchedule.exists();
	if (filePocketScheduleExist) {
		await filePocketSchedule.download({ destination: `./cong_backup/${this.id}/pocket-schedules.txt` });
		const tempSchedules = await readFile(`./cong_backup/${this.id}/pocket-schedules.txt`);
		this.cong_schedule = JSON.parse(tempSchedules);
	}

	const filePocketSource = await storageBucket.file(`${this.id}/pocket-sources.txt`);
	const [filePocketSourceExist] = await filePocketSource.exists();
	if (filePocketSourceExist) {
		await filePocketSource.download({ destination: `./cong_backup/${this.id}/pocket-sources.txt` });
		const tempSources = await readFile(`./cong_backup/${this.id}/pocket-sources.txt`);
		this.cong_sourceMaterial = JSON.parse(tempSources);
	}

	if (existsSync(`./cong_backup/${this.id}`)) await rm(`./cong_backup/${this.id}`, { recursive: true, force: true });

	this.cong_swsPocket = congSnap.data().cong_swsPocket || [];
	this.cong_settings = congSnap.data().cong_settings || [];
	this.cong_members.length = 0;
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

Congregation.prototype.isMember = function (uid) {
	const user = users.findUserByAuthUid(uid);
	return user.cong_id === this.id;
};

Congregation.prototype.saveBackup = async function (
	cong_persons,
	cong_deleted,
	cong_schedule,
	cong_sourceMaterial,
	cong_swsPocket,
	cong_settings,
	uid
) {
	const oldestWeekDate = getOldestWeekDate();

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
				let newChanges = newPerson.changes;

				if (newChanges) {
					// handle non-assignments and non-time away changes
					newChanges = newChanges.filter((item) => item.field !== 'lastAssignment');

					newChanges.forEach((change) => {
						if (change.field !== 'timeAway' && change.field !== 'assignments') {
							let isChanged = false;

							const oldChange = oldChanges?.find((old) => old.field === change.field);
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
									oldPerson.changes = oldPerson.changes.filter((item) => item.field !== change.field);
								}

								if (!oldPerson.changes) {
									oldPerson.changes = [];
								}

								oldPerson.changes.push(change);
							}
						}
					});

					// handle assignments changes
					newChanges.forEach((change) => {
						if (change.field === 'assignments') {
							// handle deleted assignment
							if (change.isDeleted) {
								const toBeDeleted = oldPerson[change.field].findIndex((item) => item.code === change.value.code);
								if (toBeDeleted !== -1) oldPerson[change.field].splice(toBeDeleted, 1);
							}

							// handle added item
							if (change.isAdded) {
								const isExist = oldPerson[change.field].find((item) => item.code === change.value.code);
								if (!isExist) oldPerson[change.field].push(change.value);
							}

							// update changes
							if (!oldPerson.changes) oldPerson.changes = [];
							const filteredChanges = [];
							oldPerson.changes.forEach((item) => {
								if (item.field === 'assignments' && item.value.code === change.value.code) {
									return;
								}
								filteredChanges.push(item);
							});
							oldPerson.changes = [...filteredChanges];
							oldPerson.changes.push(change);
						}
					});

					// handle time away changes
					newChanges.forEach((change) => {
						if (change.field === 'timeAway') {
							// handle deleted item
							if (change.isDeleted) {
								const toBeDeleted = oldPerson[change.field].findIndex((item) => item.timeAwayId === change.value.timeAwayId);
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
								const toBeModified = oldPerson[change.field].findIndex((item) => item.timeAwayId === change.value.timeAwayId);

								if (toBeModified !== -1) oldPerson[change.field].splice(toBeModified, 1);
								oldPerson[change.field].push(change.value);
							}

							// update changes
							if (change.isDeleted || change.isModified) {
								if (!oldPerson.changes) oldPerson.changes = [];
								const filteredChanges = [];
								oldPerson.changes.forEach((item) => {
									if (item.field === 'timeAway' && item.value.timeAwayId === change.value.timeAwayId) {
										return;
									}
									filteredChanges.push(item);
								});
								oldPerson.changes = [...filteredChanges];
								oldPerson.changes.push(change);
							}
						}
					});
				}
			}

			if (oldPerson.id) delete oldPerson.id;
			oldPerson.changes = oldPerson.changes?.filter((item) => item.field !== 'lastAssignment') || [];
			finalPersons.push(oldPerson);
		});

		// handle new person record
		cong_persons.forEach((newPerson) => {
			const oldPerson = decryptedPersons.find((person) => person.person_uid === newPerson.person_uid);
			if (!oldPerson) {
				if (newPerson.id) delete newPerson.id;
				newPerson.changes = newPerson.changes?.filter((item) => item.field !== 'lastAssignment') || [];
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
	let encryptedPersons = encryptData(finalPersons);
	finalPersons = null;

	let finalSchedule = [];

	// new backup schedule
	if (this.cong_schedule_draft.length === 0) {
		cong_schedule.forEach((schedule) => {
			const weekOfDate = getWeekDate(schedule.weekOf);

			if (weekOfDate >= oldestWeekDate) {
				finalSchedule.push(schedule);
			}
		});
	}

	// updated schedule
	if (this.cong_schedule_draft.length > 0) {
		// handle modified schedule
		this.cong_schedule_draft.forEach((oldSchedule) => {
			const weekOfDate = getWeekDate(oldSchedule.weekOf);

			if (weekOfDate >= oldestWeekDate) {
				const newSchedule = cong_schedule.find((schedule) => schedule.weekOf === oldSchedule.weekOf);
				if (newSchedule) {
					const oldChanges = oldSchedule.changes;
					const newChanges = newSchedule.changes;

					if (newChanges) {
						newChanges.forEach((change) => {
							let isChanged = false;

							const oldChange = oldChanges?.find((old) => old.field === change.field);
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
								oldSchedule[change.field] = change.value || null;

								if (oldSchedule.changes) {
									oldSchedule.changes = oldSchedule.changes.filter((item) => item.field !== change.field);
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
			}
		});

		// handle new schedule record
		cong_schedule.forEach((newSchedule) => {
			const weekOfDate = getWeekDate(newSchedule.weekOf);
			const oldestWeekDate = getOldestWeekDate();

			if (weekOfDate >= oldestWeekDate) {
				const oldSchedule = this.cong_schedule_draft.find((schedule) => schedule.weekOf === newSchedule.weekOf);
				if (!oldSchedule) {
					finalSchedule.push(newSchedule);
				}
			}
		});
	}

	cong_sourceMaterial.forEach((newSource) => {
		const weekOfDate = getWeekDate(newSource.weekOf);

		if (weekOfDate >= oldestWeekDate) {
			const oldSource = this.cong_sourceMaterial_draft.find((source) => source.weekOf === newSource.weekOf);
			const oldSourceIndex = this.cong_sourceMaterial_draft.findIndex((source) => source.weekOf === newSource.weekOf);

			if (!oldSource) {
				this.cong_sourceMaterial_draft.push(newSource);
			}

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
						if (key.indexOf('_override') !== -1) {
							if (value) newSource[key] = value;
						}
					}

					this.cong_sourceMaterial_draft.splice(oldSourceIndex, 1, newSource);
				}
			}
		}
	});

	this.cong_sourceMaterial_draft = this.cong_sourceMaterial_draft.filter(
		(source) => getWeekDate(source.weekOf) >= oldestWeekDate
	);

	const userInfo = users.findUserByAuthUid(uid);

	const data = {
		cong_swsPocket: cong_swsPocket,
		cong_settings: cong_settings,
		last_backup: {
			by: userInfo.id,
			date: new Date(),
		},
	};

	await db.collection('congregations').doc(this.id).set(data, { merge: true });

	if (!existsSync(`./cong_backup`)) await mkdir(`./cong_backup`);
	if (!existsSync(`./cong_backup/${this.id}`)) await mkdir(`./cong_backup/${this.id}`);
	await writeFile(`./cong_backup/${this.id}/persons.txt`, encryptedPersons);
	await writeFile(`./cong_backup/${this.id}/schedules.txt`, JSON.stringify(finalSchedule));
	await writeFile(`./cong_backup/${this.id}/sources.txt`, JSON.stringify(this.cong_sourceMaterial_draft));

	const storageBucket = getStorage().bucket();
	await storageBucket.upload(`./cong_backup/${this.id}/persons.txt`, { destination: `${this.id}/persons.txt` });
	await storageBucket.upload(`./cong_backup/${this.id}/schedules.txt`, { destination: `${this.id}/schedules.txt` });
	await storageBucket.upload(`./cong_backup/${this.id}/sources.txt`, { destination: `${this.id}/sources.txt` });
	await rm(`./cong_backup/${this.id}`, { recursive: true, force: true });

	this.cong_persons = encryptedPersons;
	this.cong_schedule_draft = finalSchedule;
	this.cong_swsPocket = cong_swsPocket;
	this.cong_settings = cong_settings;
	this.last_backup = {
		by: userInfo.username,
		date: data.last_backup.date,
	};

	encryptedPersons = null;
	finalSchedule = null;
};

Congregation.prototype.retrieveBackup = function () {
	// decrypt cong_persons data
	const decryptedPersons = this.cong_persons === '' ? [] : JSON.parse(decryptData(this.cong_persons));

	return {
		cong_persons: decryptedPersons,
		cong_schedule: this.cong_schedule_draft,
		cong_sourceMaterial: this.cong_sourceMaterial_draft,
		cong_swsPocket: this.cong_swsPocket,
		cong_settings: this.cong_settings,
	};
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

Congregation.prototype.addUser = async function (userId, role, fullname) {
	const newRole = role || [];
	const data = { congregation: { id: this.id, role: newRole } };
	await db.collection('users').doc(userId).set(data, { merge: true });

	if (fullname) {
		await db.collection('users').doc(userId).update({
			'about.name': fullname,
		});
	}

	// update users list
	const user = users.findUserById(userId);
	user.cong_id = this.id;
	user.cong_name = this.cong_name;
	user.cong_number = this.cong_number;
	user.cong_role = newRole;
	user.cong_country = this.country_code;
	if (fullname) user.username = fullname;

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

	for (const schedule of cong_schedules) {
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
		cong_settings,
	});

	if (!existsSync(`./cong_backup`)) await mkdir(`./cong_backup`);
	if (!existsSync(`./cong_backup/${this.id}`)) await mkdir(`./cong_backup/${this.id}`);
	await writeFile(`./cong_backup/${this.id}/pocket-schedules.txt`, JSON.stringify(newSchedule));
	await writeFile(`./cong_backup/${this.id}/pocket-sources.txt`, JSON.stringify(newSource));

	const storageBucket = getStorage().bucket();
	await storageBucket.upload(`./cong_backup/${this.id}/pocket-schedules.txt`, { destination: `${this.id}/pocket-schedules.txt` });
	await storageBucket.upload(`./cong_backup/${this.id}/pocket-sources.txt`, { destination: `${this.id}/pocket-sources.txt` });
	await rm(`./cong_backup/${this.id}`, { recursive: true, force: true });

	this.cong_schedule = newSchedule;
	this.cong_sourceMaterial = newSource;
	this.cong_settings = cong_settings;
};
