import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as OTPAuth from 'otpauth';
import randomstring from 'randomstring';
import { decryptData, encryptData } from '../utils/encryption-utils.js';
import { sendUserResetPassword, sendVerificationEmail } from '../utils/sendEmail.js';
import { congregations } from './Congregations.js';

const db = getFirestore(); //get default database

export class User {
	constructor(id) {
		this.id = id;
		this.user_uid = '';
		this.pocket_local_id = '';
		this.pocket_devices = [];
		this.pocket_oCode = '';
		this.pocket_members = [];
		this.cong_id = '';
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
	}
}

User.prototype.loadDetails = async function () {
	const userRef = db.collection('users').doc(this.id);
	const userSnap = await userRef.get();

	this.username = userSnap.data().about.name;
	this.auth_uid = userSnap.data().about?.auth_uid || '';
	this.secret = userSnap.data().about?.secret || '';
	this.sessions = userSnap.data().about?.sessions || [];
	this.global_role = userSnap.data().about.role;
	this.mfaEnabled = userSnap.data().about?.mfaEnabled || false;
	this.cong_id = userSnap.data().congregation?.id || '';
	this.cong_role = userSnap.data().congregation?.role || [];
	this.pocket_local_id = userSnap.data().congregation?.local_id || null;
	this.pocket_members = userSnap.data().congregation?.pocket_members || [];

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

User.prototype.updatePocketDetails = async function ({ cong_role, pocket_members }) {
	try {
		await db
			.collection('users')
			.doc(this.id)
			.update({ 'congregation.pocket_members': pocket_members, 'congregation.pocket_role': cong_role });

		this.pocket_members = pocket_members;
		this.cong_role = cong_role;

		// update cong members
		const cong = congregations.findCongregationById(this.cong_id);
		cong.reloadMembers();
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.updatePocketMembers = async function (members) {
	try {
		await db.collection('users').doc(this.id).update({ 'congregation.pocket_members': members });
		this.pocket_members = members;

		// update cong members
		const cong = congregations.findCongregationById(this.cong_id);
		cong.reloadMembers();
	} catch (error) {
		throw new Error(error.message);
	}
};

User.prototype.updatePocketLocalId = async function (id) {
	try {
		if (id !== '') {
			await db.collection('users').doc(this.id).update({ 'congregation.local_id': id });
		} else {
			await db.collection('users').doc(this.id).update({ 'congregation.local_id': FieldValue.delete() });
		}

		this.pocket_local_id = id;

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
			country_name: session.visitor_details.ipLocation.country.name,
			device: {
				browserName: session.visitor_details.browserDetails.browserName,
				os: session.visitor_details.browserDetails.os,
				osVersion: session.visitor_details.browserDetails.osVersion,
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
	this.secret = encryptData;
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
			name: foundDevice.name,
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
