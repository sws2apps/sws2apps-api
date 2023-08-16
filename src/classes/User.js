import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as OTPAuth from 'otpauth';
import dayjs from 'dayjs';
import randomstring from 'randomstring';
import { decryptData, encryptData } from '../utils/encryption-utils.js';
import { sendEmailOTPCode, sendUserResetPassword, sendVerificationEmail } from '../utils/sendEmail.js';
import { congregations } from './Congregations.js';
import { getFileFromStorage } from '../utils/storage-utils.js';
import { uploadFileToStorage } from '../utils/storage-utils.js';

const db = getFirestore(); //get default database

export class User {
	constructor(id) {
		this.id = id;
		this.user_uid = '';
		this.user_local_uid = '';
		this.pocket_devices = [];
		this.pocket_oCode = '';
		this.user_members_delegate = [];
		this.cong_id = '';
		this.cong_country = '';
		this.cong_name = '';
		this.cong_number = '';
		this.cong_role = [];
		this.mfaEnabled = false;
		this.username = '';
		this.global_role = '';
		this.sessions = [];
		this.last_seen = '';
		this.auth_uid = '';
		this.emailVerified = false;
		this.disabled = true;
		this.secret = '';
		this.auth_provider = '';
		this.isTest = false;
		this.emailOTP = {};
		this.bibleStudies = [];
		this.fieldServiceReports = [];
		this.last_backup = undefined;
	}
}

User.prototype.loadDetails = async function () {
	const userRef = db.collection('users').doc(this.id);
	const userSnap = await userRef.get();

	this.username = userSnap.data().about.name;
	this.isTest = userSnap.data().about.isTest || false;
	this.auth_uid = userSnap.data().about?.auth_uid || '';
	this.secret = userSnap.data().about?.secret || '';
	this.sessions = userSnap.data().about?.sessions || [];
	this.global_role = userSnap.data().about.role;
	this.mfaEnabled = userSnap.data().about?.mfaEnabled || false;
	this.emailOTP = userSnap.data().about?.emailOTP || {};
	this.cong_id = userSnap.data().congregation?.id || '';
	this.cong_role = userSnap.data().congregation?.role || [];
	this.user_local_uid = userSnap.data().congregation?.local_uid || null;
	this.user_members_delegate = userSnap.data().congregation?.members_delegate || [];

	let tmpDate = userSnap.data().congregation?.last_backup || undefined;
	if (tmpDate) {
		tmpDate = dayjs.unix(tmpDate._seconds).$d;
	}

	this.last_backup = tmpDate;

	if (this.global_role === 'pocket') {
		this.pocket_devices = userSnap.data().congregation?.devices || [];
		this.pocket_oCode = userSnap.data().congregation?.oCode || '';
		this.cong_role = userSnap.data().congregation?.pocket_role || [];
		let lastSeens = this.pocket_devices.map((device) => {
			return { last_seen: device.sws_last_seen };
		});

		lastSeens.sort((a, b) => {
			return a.last_seen > b.last_seen ? -1 : 1;
		});

		this.last_seen = lastSeens[0]?.last_seen || undefined;
	} else {
		const userRecord = await getAuth().getUser(this.auth_uid);
		this.user_uid = userRecord.email;
		this.auth_provider = userRecord.providerData[0]?.providerId || 'email';
		this.emailVerified = userRecord.emailVerified;
		this.disabled = userRecord.disabled;

		let lastSeens = this.sessions.map((session) => {
			return { last_seen: session.sws_last_seen };
		});

		lastSeens.sort((a, b) => {
			return a.last_seen > b.last_seen ? -1 : 1;
		});

		this.last_seen = lastSeens[0]?.last_seen || undefined;
	}

	if (this.cong_id.length > 0) {
		const congRef = db.collection('congregations').doc(this.cong_id);
		const docSnap = await congRef.get();
		this.cong_name = docSnap.data().cong_name || '';
		this.cong_number = docSnap.data().cong_number || '';
		this.cong_country = docSnap.data().country_code || '';

		if (!existsSync(`./cong_backup`)) await mkdir(`./cong_backup`);
		if (!existsSync(`./cong_backup/${this.cong_id}`)) await mkdir(`./cong_backup/${this.cong_id}`);
		if (!existsSync(`./cong_backup/${this.cong_id}/usersData`)) await mkdir(`./cong_backup/${this.cong_id}/usersData`);
		if (!existsSync(`./cong_backup/${this.cong_id}/usersData/${this.user_local_uid}`))
			await mkdir(`./cong_backup/${this.cong_id}/usersData/${this.user_local_uid}`);

		this.bibleStudies = await getFileFromStorage(this.cong_id, `usersData/${this.user_local_uid}/bibleStudies.txt`);
		this.fieldServiceReports = await getFileFromStorage(this.cong_id, `usersData/${this.user_local_uid}/fieldServiceReports.txt`);
	}

	return this;
};

User.prototype.updateEmailAuth = async function (uid, email) {
	try {
		await getAuth().updateUser(uid, { email });
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.updateFullname = async function (value) {
	try {
		await db.collection('users').doc(this.id).update({ 'about.name': value });
		this.username = value;
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.updatePocketDetails = async function ({ user_local_uid, user_role, user_members_delegate }) {
	try {
		await db.collection('users').doc(this.id).update({
			'congregation.local_uid': user_local_uid,
			'congregation.members_delegate': user_members_delegate,
			'congregation.pocket_role': user_role,
		});

		this.user_local_uid = user_local_uid;
		this.user_members_delegate = user_members_delegate;
		this.cong_role = user_role;

		// update cong members
		const cong = congregations.findCongregationById(this.cong_id);
		cong.reloadMembers();
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.updateMembersDelegate = async function (members) {
	try {
		await db.collection('users').doc(this.id).update({ 'congregation.members_delegate': members });
		this.user_members_delegate = members;

		// update cong members
		const cong = congregations.findCongregationById(this.cong_id);
		cong.reloadMembers();
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.updateLocalUID = async function (id) {
	try {
		if (id !== '') {
			await db.collection('users').doc(this.id).update({ 'congregation.local_uid': id });
		} else {
			await db.collection('users').doc(this.id).update({ 'congregation.local_uid': FieldValue.delete() });
		}

		this.user_local_uid = id;

		// update cong members
		const cong = congregations.findCongregationById(this.cong_id);
		cong.reloadMembers();
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.updatePassword = async function (value) {
	try {
		await getAuth().updateUser(this.auth_uid, { password: value });
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.getActiveSessions = function () {
	const result = this.sessions.map((session) => {
		return {
			visitorid: session.visitorid,
			ip: session.visitor_details.ip,
			country_name: session.visitor_details.ipLocation.country_name,
			device: {
				browserName: session.visitor_details.browser,
				os: session.visitor_details.os,
			},
			last_seen: session.sws_last_seen,
		};
	});

	return result;
};

User.prototype.revokeSession = async function (visitorID) {
	try {
		const newSessions = this.sessions.filter((session) => session.visitorid !== visitorID);

		await db.collection('users').doc(this.id).update({ 'about.sessions': newSessions });

		this.sessions = newSessions;
		return this.getActiveSessions();
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.removeExpiredSession = async function () {
	try {
		const currentDate = new Date().getTime();
		let validSessions = this.sessions.filter((session) => session.expires > currentDate);

		await db.collection('users').doc(this.id).update({ 'about.sessions': validSessions });

		this.sessions = validSessions;
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.updateSessions = async function (sessions) {
	try {
		await db.collection('users').doc(this.id).update({ 'about.sessions': sessions });

		this.sessions = sessions;
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.enableMFA = async function () {
	try {
		await db.collection('users').doc(this.id).update({ 'about.mfaEnabled': true });

		this.mfaEnabled = true;
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.logout = async function (visitorID) {
	try {
		await this.revokeSession(visitorID);
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.adminLogout = async function () {
	await db.collection('users').doc(this.id).update({ 'about.sessions': [] });
	this.sessions = [];
};

User.prototype.generateSecret = async function () {
	try {
		const isProd = process.env.NODE_ENV === 'production';

		if (this.secret && this.secret !== '') {
			const decryptedData = JSON.parse(decryptData(this.secret));
			return decryptedData;
		} else {
			const tempSecret = new OTPAuth.Secret().base32;

			const totp = new OTPAuth.TOTP({
				issuer: isProd ? 'sws2apps' : 'sws2apps-test',
				label: this.user_uid,
				algorithm: 'SHA1',
				digits: 6,
				period: 30,
				secret: OTPAuth.Secret.fromBase32(tempSecret),
			});

			const secret = {
				secret: tempSecret,
				uri: totp.toString(),
				version: 2,
			};

			const encryptedData = encryptData(secret);

			// save secret
			await db.collection('users').doc(this.id).update({ 'about.secret': encryptedData });

			this.secret = encryptedData;
			return secret;
		}
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.generatePocketCode = async function () {
	try {
		const cong = congregations.findCongregationById(this.cong_id);

		const randomString = randomstring.generate(10).toUpperCase();
		const code = `${cong.country_code}${cong.cong_number}-${randomString}`;
		const secureCode = encryptData(code);

		await db.collection('users').doc(this.id).update({
			'congregation.oCode': secureCode,
		});

		this.pocket_oCode = secureCode;

		cong.reloadMembers();

		return code;
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.removePocketCode = async function () {
	try {
		await db.collection('users').doc(this.id).update({
			'congregation.oCode': '',
		});

		this.pocket_oCode = '';

		const cong = congregations.findCongregationById(this.cong_id);
		cong.reloadMembers();
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.decryptSecret = function () {
	try {
		const decryptedData = decryptData(this.secret);
		const secret = JSON.parse(decryptedData);
		return { ...secret, version: secret.version || 1 };
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.updatePocketDevices = async function (devices) {
	try {
		await db.collection('users').doc(this.id).update({
			'congregation.oCode': FieldValue.delete(),
			'congregation.devices': devices,
		});

		this.pocket_oCode = '';
		this.pocket_devices = devices;

		// update cong info
		const cong = congregations.findCongregationById(this.cong_id);
		cong.reloadMembers();

		return this;
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.removePocketDevice = async function (devices) {
	await db.collection('users').doc(this.id).update({
		'congregation.devices': devices,
	});

	this.pocket_devices = devices;

	// update cong info
	const cong = congregations.findCongregationById(this.cong_id);
	cong.reloadMembers();
};

User.prototype.enable = async function () {
	if (this.global_role === 'vip') {
		await getAuth().updateUser(this.auth_uid, { disabled: false });
	}

	this.disabled = false;
};

User.prototype.disable = async function () {
	if (this.global_role === 'vip') {
		await getAuth().updateUser(this.auth_uid, { disabled: true });
	}

	this.disabled = true;
};

User.prototype.resetPassword = async function () {
	const resetLink = await getAuth().generatePasswordResetLink(this.user_uid);
	sendUserResetPassword(this.user_uid, this.username, resetLink);
};

User.prototype.revokeToken = async function () {
	// generate new secret and encrypt
	const tempSecret = new OTPAuth.Secret().base32;

	const totp = new OTPAuth.TOTP({
		issuer: 'sws2apps',
		label: this.user_uid,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(tempSecret),
	});

	const secret = {
		secret: tempSecret,
		uri: totp.toString(),
		version: 2,
	};

	const encryptedData = encryptData(secret);

	// remove all sessions and save new secret
	const data = {
		'about.mfaEnabled': false,
		'about.secret': encryptedData,
		'about.sessions': [],
	};
	await db.collection('users').doc(this.id).update(data);

	this.mfaEnabled = false;
	this.secret = encryptedData;
	this.sessions = [];
};

User.prototype.makeAdmin = async function () {
	await db.collection('users').doc(this.id).update({ 'about.role': 'admin' });
	this.global_role = 'admin';
};

User.prototype.resendVerificationEmail = async function () {
	const link = await getAuth().generateEmailVerificationLink(this.user_uid);
	sendVerificationEmail(this.user_uid, this.username, link);
};

User.prototype.updatePocketDevicesInfo = async function (visitorid) {
	const foundDevice = this.pocket_devices.find((device) => device.visitorid === visitorid);
	const filteredDevices = this.pocket_devices.filter((device) => device.visitorid !== visitorid);

	const updatedDevices = [
		{
			visitorid,
			visitor_details: foundDevice.visitor_details,
			sws_last_seen: new Date().getTime(),
		},
		...filteredDevices,
	];

	await db
		.collection('users')
		.doc(this.id)
		.update({ 'congregation.devices': updatedDevices, 'congregation.oCode': FieldValue.delete() });

	this.pocket_devices = updatedDevices;
	this.pocket_oCode = '';
};

User.prototype.updateSessionsInfo = async function (visitorid) {
	const time = new Date().getTime();
	let newSessions = this.sessions.map((session) => {
		if (session.visitorid === visitorid) {
			return { ...session, sws_last_seen: time };
		} else {
			return session;
		}
	});

	await db.collection('users').doc(this.id).update({ 'about.sessions': newSessions });

	this.sessions = newSessions;
	this.last_seen = time;

	// update cong members
	if (this.cong_id !== '') {
		const cong = congregations.findCongregationById(this.cong_id);
		cong.reloadMembers();
	}
};

User.prototype.createTempOTPCode = async function (language) {
	const codeValue = randomstring.generate({
		length: 6,
		charset: 'numeric',
	});
	const codeEncrypted = encryptData(codeValue);

	const data = {
		code: codeEncrypted,
		expired: new Date().getTime() + 5 * 60000, // expired after 5 min
	};

	await db.collection('users').doc(this.id).update({ 'about.emailOTP': data });
	this.emailOTP = data;

	sendEmailOTPCode(this.user_uid, codeValue, language);
};

User.prototype.verifyTempOTPCode = async function (code) {
	if (this.emailOTP.code) {
		const verify = decryptData(this.emailOTP.code);
		const timeExpired = this.emailOTP.expired;

		const currentTime = new Date().getTime();

		if (code === verify && currentTime <= timeExpired) {
			await db.collection('users').doc(this.id).update({ 'about.emailOTP': FieldValue.delete() });
			this.emailOTP = {};
			return true;
		}
	}

	return false;
};

User.prototype.saveBibleStudiesBackup = async function (user_bibleStudies) {
	if (user_bibleStudies) {
		// check if there are deleted records from backup
		const deletedRecords = user_bibleStudies.filter((record) => record.isDeleted === true);

		const newRecords = [];

		// clean existing records to remove deleted
		for (const record of this.bibleStudies) {
			const isDeleted = deletedRecords.find((item) => item.uid === record.uid);

			// skip deleted
			if (isDeleted) continue;

			newRecords.push(record);
		}

		// append from backup
		for (const record of user_bibleStudies) {
			const oldRecord = newRecords.find((item) => item.uid === record.uid);

			// add new record and continue loop
			if (!oldRecord) {
				newRecords.push(record);
				continue;
			}

			// update existing
			if (oldRecord) {
				const newChanges = record.changes || [];
				const oldChanges = oldRecord.changes || [];

				for (const change of newChanges) {
					const oldChange = oldChanges.find((item) => item.field === change.field);

					if (!oldChange) {
						oldRecord[change.field] = change.value;
						if (!oldRecord.changes) oldRecord.changes = [];
						oldRecord.changes.push(change);
					}

					if (oldChange) {
						const oldDate = new Date(oldChange.date);
						const newDate = new Date(change.date);

						if (newDate > oldDate) {
							oldRecord[change.field] = change.value;
							oldRecord.changes = oldRecord.changes.filter((item) => item.field !== change.field);
							oldRecord.changes.push(change);
						}
					}
				}
			}
		}

		this.bibleStudies = newRecords;
	}
};

User.prototype.saveFieldServiceReportsBackup = async function (user_fieldServiceReports) {
	if (user_fieldServiceReports) {
		// check if there are deleted records from backup
		const deletedRecords = user_fieldServiceReports.filter((record) => record.isDeleted === true);

		const newRecords = [];

		// clean existing records to remove deleted
		for (const record of this.fieldServiceReports) {
			const isDeleted = deletedRecords.find((item) => item.report_uid === record.report_uid);

			// skip deleted
			if (isDeleted) continue;

			newRecords.push(record);
		}

		// append from backup
		for (const record of user_fieldServiceReports) {
			const oldRecord = newRecords.find((item) => item.report_uid === record.report_uid);

			// add new record and continue loop
			if (!oldRecord) {
				newRecords.push(record);
				continue;
			}

			// update existing
			if (oldRecord) {
				const newChanges = record.changes || [];
				const oldChanges = oldRecord.changes || [];

				for (const change of newChanges) {
					// update S4 and S21 records
					if (record.isS4 || record.isS21) {
						const oldDate = oldChanges[0] ? new Date(oldChanges[0].date) : undefined;
						const newDate = new Date(change.date);

						let isUpdate = false;

						if (!oldDate) isUpdate = true;
						if (oldDate && oldDate < newDate) isUpdate = true;

						if (isUpdate) {
							oldRecord.changes = [];
							oldRecord.changes.push(change);

							for (const [key, value] of Object.entries(record)) {
								if (key !== 'changes') oldRecord[key] = value;
							}
						}
					}

					// update daily records
					if (!record.isS4 && !record.isS21) {
						const oldChange = oldChanges.find((item) => item.field === change.field);

						if (!oldChange) {
							oldRecord[change.field] = change.value;
							if (!oldRecord.changes) oldRecord.changes = [];
							oldRecord.changes.push(change);
						}

						if (oldChange) {
							const oldDate = new Date(oldChange.date);
							const newDate = new Date(change.date);

							if (newDate > oldDate) {
								oldRecord[change.field] = change.value;
								oldRecord.changes = oldRecord.changes.filter((item) => item.field !== change.field);
								oldRecord.changes.push(change);
							}
						}
					}
				}
			}
		}

		this.fieldServiceReports = newRecords;
	}
};

User.prototype.saveBackup = async function (payload) {
	if (!existsSync(`./cong_backup`)) await mkdir(`./cong_backup`);
	if (!existsSync(`./cong_backup/${this.cong_id}`)) await mkdir(`./cong_backup/${this.cong_id}`);
	if (!existsSync(`./cong_backup/${this.cong_id}/usersData`)) await mkdir(`./cong_backup/${this.cong_id}/usersData`);
	if (!existsSync(`./cong_backup/${this.cong_id}/usersData/${this.user_local_uid}`))
		await mkdir(`./cong_backup/${this.cong_id}/usersData/${this.user_local_uid}`);

	const user_bibleStudies = payload.user_bibleStudies;
	const user_fieldServiceReports = payload.user_fieldServiceReports;

	await this.saveBibleStudiesBackup(user_bibleStudies);
	await this.saveFieldServiceReportsBackup(user_fieldServiceReports);

	await uploadFileToStorage(this.cong_id, JSON.stringify(this.bibleStudies), 'bibleStudies.txt', this.user_local_uid);

	await uploadFileToStorage(
		this.cong_id,
		JSON.stringify(this.fieldServiceReports),
		'fieldServiceReports.txt',
		this.user_local_uid
	);

	await rm(`./cong_backup/${this.cong_id}`, { recursive: true, force: true });

	const lastBackup = new Date();

	await db.collection('users').doc(this.id).update({ 'congregation.last_backup': lastBackup });

	this.last_backup = lastBackup;
};

User.prototype.retrieveBackup = function () {
	return {
		user_bibleStudies: this.bibleStudies,
		user_fieldServiceReports: this.fieldServiceReports,
	};
};

User.prototype.quickSaveFieldServiceReports = async function () {
	if (!existsSync(`./cong_backup`)) await mkdir(`./cong_backup`);
	if (!existsSync(`./cong_backup/${this.cong_id}`)) await mkdir(`./cong_backup/${this.cong_id}`);
	if (!existsSync(`./cong_backup/${this.cong_id}/usersData`)) await mkdir(`./cong_backup/${this.cong_id}/usersData`);
	if (!existsSync(`./cong_backup/${this.cong_id}/usersData/${this.user_local_uid}`))
		await mkdir(`./cong_backup/${this.cong_id}/usersData/${this.user_local_uid}`);

	await uploadFileToStorage(
		this.cong_id,
		JSON.stringify(this.fieldServiceReports),
		'fieldServiceReports.txt',
		this.user_local_uid
	);

	await rm(`./cong_backup/${this.cong_id}`, { recursive: true, force: true });
};

User.prototype.updatePendingFieldServiceReports = async function (report) {
	this.fieldServiceReports = this.fieldServiceReports.filter((record) => record.report_uid !== report.report_uid);
	this.fieldServiceReports.push(report);

	await this.quickSaveFieldServiceReports();
};

User.prototype.unpostFieldServiceReports = async function (month) {
	const currentS4 = this.fieldServiceReports.find((oldReport) => oldReport.isS4 && oldReport.month === month);
	currentS4.isSubmitted = false;

	await this.quickSaveFieldServiceReports();
};

User.prototype.approveFieldServiceReports = async function (month) {
	const currentS4 = this.fieldServiceReports.find((oldReport) => oldReport.isS4 && oldReport.month === month);
	currentS4.changes = [];
	currentS4.changes.push({ date: new Date() });
	currentS4.isPending = false;

	await this.quickSaveFieldServiceReports();
};

User.prototype.disapproveFieldServiceReports = async function (month) {
	const currentS4 = this.fieldServiceReports.find((oldReport) => oldReport.isS4 && oldReport.month === month);
	currentS4.changes = [];
	currentS4.changes.push({ date: new Date() });
	currentS4.isPending = true;
	currentS4.isSubmitted = false;

	await this.quickSaveFieldServiceReports();
};
