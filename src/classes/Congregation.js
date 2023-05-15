import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import dayjs from 'dayjs';
import randomstring from 'randomstring';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { decryptData, encryptData } from '../utils/encryption-utils.js';
import { users } from './Users.js';
import { getOldestWeekDate, getWeekDate } from '../utils/date.js';
import { getFileFromStorage, uploadFileToStorage } from '../utils/storage-utils.js';
import { serviceYearExpired, serviceYearFromMonth } from '../utils/congregation-utils.js';

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
	this.cong_branchReports = [];
	this.cong_fieldServiceGroup = [];
	this.cong_fieldServiceReports = [];
	this.cong_lateReports = [];
	this.cong_meetingAttendance = [];
	this.cong_minutesReports = [];
	this.cong_serviceYear = [];

	if (!existsSync(`./cong_backup`)) await mkdir(`./cong_backup`);
	if (!existsSync(`./cong_backup/${this.id}`)) await mkdir(`./cong_backup/${this.id}`);

	this.cong_persons = await getFileFromStorage(this.id, 'persons.txt', true);
	this.cong_schedule_draft = await getFileFromStorage(this.id, 'schedules.txt');
	this.cong_sourceMaterial_draft = await getFileFromStorage(this.id, 'sources.txt');
	this.cong_schedule = await getFileFromStorage(this.id, 'pocket-schedules.txt');
	this.cong_sourceMaterial = await getFileFromStorage(this.id, 'pocket-sources.txt');
	this.cong_branchReports = await getFileFromStorage(this.id, 'branch-reports.txt');
	this.cong_fieldServiceGroup = await getFileFromStorage(this.id, 'field-service-group.txt');
	this.cong_fieldServiceReports = await getFileFromStorage(this.id, 'field-service-reports.txt');
	this.cong_meetingAttendance = await getFileFromStorage(this.id, 'meeting-attendance.txt');

	if (existsSync(`./cong_backup/${this.id}`)) {
		await rm(`./cong_backup/${this.id}`, { recursive: true, force: true });
	}

	this.cong_swsPocket = congSnap.data().cong_swsPocket || [];
	this.cong_settings = congSnap.data().cong_settings || [];
	this.cong_serviceYear = congSnap.data().cong_serviceYear || [];
	this.cong_minutesReports = congSnap.data().cong_minutesReports || [];
	this.cong_lateReports = congSnap.data().cong_lateReports || [];
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

Congregation.prototype.mergePersonsFromBackup = function (cong_persons, cong_deleted) {
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
						if (
							change.field !== 'timeAway' &&
							change.field !== 'assignments' &&
							change.field !== 'spiritualStatus' &&
							change.field !== 'otherService'
						) {
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
							if (!oldPerson[change.field]) oldPerson[change.field] = [];

							// handle deleted assignment
							if (change.isDeleted) {
								oldPerson[change.field] = oldPerson[change.field].filter((item) => item.code !== change.value.code);
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
							if (!oldPerson[change.field]) oldPerson[change.field] = [];

							// handle deleted item
							if (change.isDeleted) {
								oldPerson[change.field] = oldPerson[change.field].filter((item) => item.timeAwayId !== change.value.timeAwayId);
							}

							// handle added item
							if (change.isAdded) {
								const isExist = oldPerson[change.field].find((item) => item.timeAwayId === change.value.timeAwayId);
								if (!isExist) {
									oldPerson[change.field].push(change.value);
									if (!oldPerson.changes) oldPerson.changes = [];
									oldPerson.changes.push(change);
								}
							}

							// handle modified item
							if (change.isModified) {
								oldPerson[change.field] = oldPerson[change.field].filter((item) => item.timeAwayId !== change.value.timeAwayId);
								oldPerson[change.field].push(change.value);
							}

							// update changes
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
					});

					// handle status changes
					newChanges.forEach((change) => {
						if (change.field === 'spiritualStatus') {
							const filteredValues = [];
							oldPerson[change.field]?.forEach((item) => {
								if (item.statusId === change.value.statusId) {
									return;
								}
								filteredValues.push(item);
							});
							oldPerson[change.field] = [...filteredValues];

							// handle added item
							if (change.isAdded) {
								oldPerson[change.field].push(change.value);
							}

							// handle modified item
							if (change.isModified) {
								oldPerson[change.field].push(change.value);
							}

							// update changes
							if (!oldPerson.changes) oldPerson.changes = [];
							const filteredChanges = [];
							oldPerson.changes.forEach((item) => {
								if (item.field === 'spiritualStatus' && item.value.statusId === change.value.statusId) {
									return;
								}
								filteredChanges.push(item);
							});
							oldPerson.changes = [...filteredChanges];
							oldPerson.changes.push(change);
						}
					});

					// handle service changes
					newChanges.forEach((change) => {
						if (change.field === 'otherService') {
							const filteredValues = [];
							oldPerson[change.field]?.forEach((item) => {
								if (item.serviceId === change.value.serviceId) {
									return;
								}
								filteredValues.push(item);
							});
							oldPerson[change.field] = [...filteredValues];

							// handle added item
							if (change.isAdded) {
								oldPerson[change.field].push(change.value);
							}

							// handle modified item
							if (change.isModified) {
								oldPerson[change.field].push(change.value);
							}

							// update changes
							if (!oldPerson.changes) oldPerson.changes = [];
							const filteredChanges = [];
							oldPerson.changes.forEach((item) => {
								if (item.field === 'otherService' && item.value.serviceId === change.value.serviceId) {
									return;
								}
								filteredChanges.push(item);
							});
							oldPerson.changes = [...filteredChanges];
							oldPerson.changes.push(change);
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

	return finalPersons;
};

Congregation.prototype.mergeSchedulesFromBackup = function (cong_schedule) {
	let finalSchedule = [];

	const oldestWeekDate = getOldestWeekDate();

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

	return finalSchedule;
};

Congregation.prototype.mergeSourceMaterialsFromBackup = function (cong_sourceMaterial) {
	const oldestWeekDate = getOldestWeekDate();

	for (const newSource of cong_sourceMaterial) {
		const weekOfDate = getWeekDate(newSource.weekOf);

		if (weekOfDate >= oldestWeekDate) {
			const oldSource = this.cong_sourceMaterial_draft.find((source) => source.weekOf === newSource.weekOf);
			const oldSourceIndex = this.cong_sourceMaterial_draft.findIndex((source) => source.weekOf === newSource.weekOf);

			if (!oldSource) {
				this.cong_sourceMaterial_draft.push(newSource);
				continue;
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
				}

				this.cong_sourceMaterial_draft.splice(oldSourceIndex, 1, newSource);
			}
		}
	}

	this.cong_sourceMaterial_draft = this.cong_sourceMaterial_draft.filter(
		(source) => getWeekDate(source.weekOf) >= oldestWeekDate
	);
};

Congregation.prototype.mergeServiceYearFromBackup = function (cong_serviceYear) {
	// clean existing
	let newServiceYear = [];

	for (const existSY of this.cong_serviceYear) {
		if (!serviceYearExpired(existSY.value)) {
			newServiceYear.push(existSY);
		}
	}

	for (const newSY of cong_serviceYear) {
		const isExist = newServiceYear.find((record) => record.value === newSY.value);
		if (!isExist && !serviceYearExpired(newSY.value)) {
			newServiceYear.push(newSY);
		}
	}

	this.cong_serviceYear = newServiceYear;
};

Congregation.prototype.mergeLateReportsFromBackup = function (cong_lateReports) {
	// check if there are deleted records from backup
	const deletedRecords = cong_lateReports.filter((record) => record.deleted === true);
	let newRecords = [];

	for (const record of this.cong_lateReports) {
		const isDeleted = deletedRecords.find((item) => item.person_uid === record.person_uid && item.month === record.month);

		if (isDeleted) continue;

		newRecords.push(record);
	}

	this.cong_lateReports = newRecords;
};

Congregation.prototype.mergeMinutesReportsFromBackup = function (cong_minutesReports) {
	// check if there are deleted records from backup
	const deletedRecords = cong_minutesReports.filter((record) => record.deleted === true);
	let newRecords = [];

	for (const record of this.cong_minutesReports) {
		const isDeleted = deletedRecords.find((item) => item.person_uid === record.person_uid && item.month === record.month);

		if (isDeleted) continue;

		newRecords.push(record);
	}

	this.cong_minutesReports = newRecords;
};

Congregation.prototype.mergeMeetingAttendanceFromBackup = function (cong_meetingAttendance) {
	for (const attendance of cong_meetingAttendance) {
		if (attendance.changes && attendance.changes.length > 0) {
			const foundAttendance = this.cong_meetingAttendance.find(
				(record) => record.service_year === attendance.service_year && record.month_value === attendance.month_value
			);

			if (!foundAttendance) {
				this.cong_meetingAttendance.push(attendance);
			}

			if (foundAttendance) {
				const changes = attendance.changes;
				changes.sort((a, b) => {
					return a.date > b.date ? 1 : -1;
				});

				for (const change of changes) {
					const oldChange = foundAttendance.changes.find((item) => item.type === change.type && item.index === change.index);

					let isUpdate = false;

					if (!oldChange) isUpdate = true;
					if (oldChange) {
						const dateA = new Date(oldChange.date);
						const dateB = new Date(change.date);

						if (dateB > dateA) isUpdate = true;
					}

					if (isUpdate) {
						let meetingArray = change.type === 'midweek' ? foundAttendance.midweek_meeting : foundAttendance.weekend_meeting;

						meetingArray = meetingArray.filter((record) => record.index !== change.index);
						meetingArray.push({ index: change.index, count: change.count });

						if (change.type === 'midweek') {
							foundAttendance.midweek_meeting = meetingArray;
						}

						if (change.type === 'weekend') {
							foundAttendance.weekend_meeting = meetingArray;
						}

						const newChanges = [];
						for (const oldChange of foundAttendance.changes) {
							if (oldChange.type === change.type && oldChange.index === change.index) {
								continue;
							}

							newChanges.push(oldChange);
						}

						foundAttendance.changes = [...newChanges];
						foundAttendance.changes.push(change);
					}
				}
			}
		}
	}
};

Congregation.prototype.mergeBranchReportsFromBackup = function (cong_branchReports) {
	// clean existing
	let newReports = [];

	for (const report of this.cong_branchReports) {
		const currentSY = serviceYearFromMonth(report.month);

		if (!serviceYearExpired(currentSY)) {
			newReports.push(report);
		}
	}

	for (const report of cong_branchReports) {
		const currentSY = serviceYearFromMonth(report.month);
		if (!serviceYearExpired(currentSY)) {
			if (report.updatedAt !== null) {
				const oldReport = newReports.find((item) => item.report === report.report && item.month === report.month);

				if (!oldReport) {
					newReports.push(report);
				}

				if (oldReport) {
					const reportDate = new Date(report.updatedAt);
					const oldDate = new Date(oldReport.updatedAt);

					if (reportDate > oldDate) {
						oldReport.updatedAt = report.updatedAt;
						oldReport.details = report.details;
					}
				}
			}
		}
	}

	return newReports;
};

Congregation.prototype.mergeFieldServiceReportsFromBackup = function (cong_fieldServiceReports, cong_deleted) {
	let newReports = [];

	newReports = [...this.cong_fieldServiceReports];

	for (const report of cong_fieldServiceReports) {
		const oldRecord = newReports.find(
			(record) => record.service_year === report.service_year && record.person_uid === report.person_uid
		);

		if (!oldRecord) {
			newReports.push(report);
		}

		if (oldRecord) {
			for (const monthReport of report.months) {
				const oldMonth = oldRecord.months.find((record) => record.month_value === monthReport.month_value);

				if (!oldMonth) {
					oldRecord.months.push(monthReport);
				}

				if (oldMonth) {
					for (const change of monthReport.changes) {
						const oldChange = oldMonth.changes.find((item) => item.field === change.field);
						if (!oldChange) {
							oldMonth[change.field] = change.value;
							oldMonth.changes.push(change);
						}

						if (oldChange) {
							const oldDate = new Date(oldChange.date);
							const newDate = new Date(change.date);

							if (newDate > oldDate) {
								oldMonth[change.field] = change.value;
								oldMonth.changes = oldMonth.changes.filter((item) => item.field !== change.field);
								oldMonth.changes.push(change);
							}
						}
					}
				}
			}
		}
	}

	// remove reports for deleted persons
	cong_deleted.forEach((deleted) => {
		newReports = newReports.filter((record) => record.person_uid !== deleted.ref);
	});

	return newReports;
};

Congregation.prototype.mergeFieldServiceGroupFromBackup = function (cong_fieldServiceGroup, cong_deleted) {
	// check if there are deleted records from backup
	const deletedRecords = cong_fieldServiceGroup.filter((record) => record.deleted === true);
	let newRecords = [];

	for (const record of this.cong_fieldServiceGroup) {
		const isDeleted = deletedRecords.find((item) => item.fieldServiceGroup_uid === record.fieldServiceGroup_uid);
		if (isDeleted) continue;

		newRecords.push(record);
	}

	for (const newList of cong_fieldServiceGroup) {
		const oldList = newRecords.find((item) => item.fieldServiceGroup_uid === newList.fieldServiceGroup_uid);

		if (!oldList) {
			newRecords.push(newList);
		}

		if (oldList) {
			// check for deleted groups
			const deletedGroups = newList.changes.filter((record) => record.type === 'deleted');
			for (const deleted of deletedGroups) {
				oldList.groups = oldList.groups.filter((record) => record.group_uid !== deleted.group_uid);

				const newChanges = [];
				for (const change of oldList.changes) {
					if (change.type === 'deleted' && change.group_uid === deleted.group_uid) continue;
					newChanges.push(change);
				}
				oldList.changes = [...newChanges];
				oldList.changes.push(deleted);
			}

			// check for added or modified groups
			const activeGroups = newList.changes.filter((record) => record.type === 'added' || record.type === 'modified');
			activeGroups.sort((a, b) => {
				return a.index > b.index ? 1 : -1;
			});

			const oldGroups = JSON.parse(JSON.stringify(oldList.groups));
			oldList.groups.length = 0;

			for (const group of activeGroups) {
				const current = oldGroups.find((item) => item.group_uid === group.group_uid);
				if (current) {
					oldList.groups.push(current);
				}

				if (!current) {
					oldList.groups.push({ group_uid: group.group_uid, persons: [] });
				}

				const newChanges = [];
				for (const change of oldList.changes) {
					if (change.type === group.type && change.group_uid === group.group_uid) continue;
					newChanges.push(change);
				}
				oldList.changes = [...newChanges];
				oldList.changes.push(group);
			}

			// handle person changes
			const personChanges = newList.changes.filter(
				(record) => record.type === 'person_added' || record.type === 'person_modified' || record.type === 'person_removed'
			);

			personChanges.sort((a, b) => {
				const dateA = new Date(a.date);
				const dateB = new Date(b.date);
				return dateA > dateB ? 1 : -1;
			});

			for (const personChange of personChanges) {
				const personDeleted = cong_deleted.find((deleted) => deleted.ref === personChange.person_uid);
				const currentGroup = oldList.groups.find((group) => group.group_uid === personChange.group_uid);

				if (personDeleted) {
					currentGroup.persons = currentGroup.persons.filter((person) => person.person_uid !== personChange.person_uid);
					oldList.changes = oldList.changes.filter((change) => change.person_uid !== personChange.person_uid);
				}

				if (!personDeleted) {
					const currentPerson = currentGroup.persons.find((person) => person.person_uid === personChange.person_uid);

					if (!currentPerson && personChange.type === 'person_added') {
						currentGroup.persons.push({ person_uid: personChange.person_uid, isAssistant: false, isOverseer: false });
					}

					if (personChange.type === 'person_removed' || personChange.type === 'person_modified') {
						currentGroup.persons = currentGroup.persons.filter((person) => person.person_uid !== personChange.person_uid);
					}

					if (personChange.type === 'person_modified') {
						const isOverseer = personChange.isOverseer || false;
						const isAssistant = personChange.isAssistant || false;
						currentGroup.persons.push({ person_uid: personChange.person_uid, isAssistant, isOverseer });
					}

					const newChanges = [];
					for (const change of oldList.changes) {
						if (
							change.type === personChange.type &&
							change.group_uid === personChange.group_uid &&
							change.person_uid === personChange.person_uid
						)
							continue;
						newChanges.push(change);
					}
					oldList.changes = [...newChanges];
					oldList.changes.push(personChange);
				}
			}
		}
	}

	return newRecords;
};

Congregation.prototype.saveBackup = async function (payload) {
	const cong_persons = payload.cong_persons;
	const cong_deleted = payload.cong_deleted;
	const cong_schedule = payload.cong_schedule;
	const cong_sourceMaterial = payload.cong_sourceMaterial;
	const cong_swsPocket = payload.cong_swsPocket;
	const cong_settings = payload.cong_settings;
	const cong_branchReports = payload.cong_branchReports;
	const cong_fieldServiceGroup = payload.cong_fieldServiceGroup;
	const cong_fieldServiceReports = payload.cong_fieldServiceReports;
	const cong_lateReports = payload.cong_lateReports;
	const cong_meetingAttendance = payload.cong_meetingAttendance;
	const cong_minutesReports = payload.cong_minutesReports;
	const cong_serviceYear = payload.cong_serviceYear;
	const uid = payload.uid;

	// update and encrypt cong_persons data
	let finalPersons = this.mergePersonsFromBackup(cong_persons, cong_deleted);
	let encryptedPersons = encryptData(finalPersons);
	finalPersons = null;

	// update cong_schedule data
	let finalSchedule = [];
	if (cong_schedule) {
		finalSchedule = this.mergeSchedulesFromBackup(cong_schedule);
	}

	// update cong_sourceMaterial data
	if (cong_sourceMaterial) {
		this.mergeSourceMaterialsFromBackup(cong_sourceMaterial);
	}

	// update cong_serviceYear data
	if (cong_serviceYear) {
		this.mergeServiceYearFromBackup(cong_serviceYear);
	}

	// update cong_lateReports data
	if (cong_lateReports) {
		this.mergeLateReportsFromBackup(cong_lateReports);
	}

	// update cong_minutesReports data
	if (cong_minutesReports) {
		this.mergeMinutesReportsFromBackup(cong_minutesReports);
	}

	// update cong_meetingAttendance data
	if (cong_meetingAttendance) {
		this.mergeMeetingAttendanceFromBackup(cong_meetingAttendance);
	}

	// update cong_branchReports data
	let finalBranchReports = [];
	if (cong_branchReports) {
		finalBranchReports = this.mergeBranchReportsFromBackup(cong_branchReports);
	}

	// update cong_branchReports data
	let finalFieldServiceReports = [];
	if (cong_fieldServiceGroup) {
		finalFieldServiceReports = this.mergeFieldServiceReportsFromBackup(cong_fieldServiceReports, cong_deleted);
	}

	// update cong_branchReports data
	let finalFieldServiceGroup = [];
	if (cong_fieldServiceGroup) {
		finalFieldServiceGroup = this.mergeFieldServiceGroupFromBackup(cong_fieldServiceGroup, cong_deleted);
	}

	const userInfo = users.findUserByAuthUid(uid);

	// remove user settings from settings
	const settingItem = { ...cong_settings[0] };

	delete settingItem.user_local_uid;
	delete settingItem.user_members_delegate;
	delete settingItem.pocket_local_id;
	delete settingItem.pocket_members;
	delete settingItem.local_uid;

	// prepare data to be stored to firestore
	const data = {
		cong_settings: [settingItem],
		last_backup: {
			by: userInfo.id,
			date: new Date(),
		},
	};

	if (cong_serviceYear) data.cong_serviceYear = this.cong_serviceYear;
	if (cong_lateReports) data.cong_lateReports = this.cong_lateReports;
	if (cong_minutesReports) data.cong_minutesReports = this.cong_minutesReports;

	if (cong_swsPocket) {
		data.cong_swsPocket = cong_swsPocket;
	}

	await db.collection('congregations').doc(this.id).set(data, { merge: true });

	// update user setting
	const userLocalUID = cong_settings[0].user_local_uid || '';
	const userMembersDelegate = cong_settings[0].user_members_delegate || [];

	await userInfo.updateLocalUID(userLocalUID);
	await userInfo.updateMembersDelegate(userMembersDelegate);

	// prepare data to be saved to storage
	if (!existsSync(`./cong_backup`)) await mkdir(`./cong_backup`);
	if (!existsSync(`./cong_backup/${this.id}`)) await mkdir(`./cong_backup/${this.id}`);

	await uploadFileToStorage(this.id, encryptedPersons, 'persons.txt');

	if (cong_schedule) {
		await uploadFileToStorage(this.id, JSON.stringify(finalSchedule), 'schedules.txt');
	}

	if (cong_sourceMaterial) {
		await uploadFileToStorage(this.id, JSON.stringify(this.cong_sourceMaterial_draft), 'sources.txt');
	}

	if (cong_meetingAttendance) {
		await uploadFileToStorage(this.id, JSON.stringify(this.cong_meetingAttendance), 'meeting-attendance.txt');
	}

	if (cong_branchReports) {
		await uploadFileToStorage(this.id, JSON.stringify(finalBranchReports), 'branch-reports.txt');
	}

	if (cong_fieldServiceReports) {
		await uploadFileToStorage(this.id, JSON.stringify(finalFieldServiceReports), 'field-service-reports.txt');
	}

	if (cong_fieldServiceGroup) {
		await uploadFileToStorage(this.id, JSON.stringify(finalFieldServiceGroup), 'field-service-group.txt');
	}

	await rm(`./cong_backup/${this.id}`, { recursive: true, force: true });

	// update class values
	this.cong_persons = encryptedPersons;
	this.cong_settings = [settingItem];
	this.last_backup = {
		by: userInfo.username,
		date: data.last_backup.date,
	};
	if (cong_schedule) this.cong_schedule_draft = finalSchedule;
	if (cong_swsPocket) this.cong_swsPocket = cong_swsPocket;
	if (cong_branchReports) this.cong_branchReports = finalBranchReports;
	if (cong_fieldServiceReports) this.cong_fieldServiceReports = finalFieldServiceReports;
	if (cong_fieldServiceGroup) this.cong_fieldServiceGroup = finalFieldServiceGroup;

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
		cong_branchReports: this.cong_branchReports,
		cong_fieldServiceGroup: this.cong_fieldServiceGroup,
		cong_fieldServiceReports: this.cong_fieldServiceReports,
		cong_lateReports: this.cong_lateReports,
		cong_meetingAttendance: this.cong_meetingAttendance,
		cong_minutesReports: this.cong_minutesReports,
		cong_serviceYear: this.cong_serviceYear,
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
			local_uid: pocketId,
			devices: [],
			oCode: secureCode,
			pocket_role: [],
			members_delegate: [],
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

	await uploadFileToStorage(this.id, JSON.stringify(newSchedule), 'pocket-schedules.txt');
	await uploadFileToStorage(this.id, JSON.stringify(newSource), 'pocket-sources.txt');

	await rm(`./cong_backup/${this.id}`, { recursive: true, force: true });

	this.cong_schedule = newSchedule;
	this.cong_sourceMaterial = newSource;
	this.cong_settings = cong_settings;
};

Congregation.prototype.isServiceYearValid = function (cong_serviceYear) {
	let isValid = true;

	for (const incomingSY of cong_serviceYear) {
		const findExisting = this.cong_serviceYear.find((record) => record.value === incomingSY.value);
		if (findExisting) {
			isValid = incomingSY.uid === findExisting.uid;
			break;
		}
	}

	return isValid;
};
