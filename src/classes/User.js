import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import twofactor from 'node-2fa';
import { decryptData, encryptData } from '../utils/encryption-utils.js';

const db = getFirestore(); //get default database

export class User {
	id;
	user_uid = '';
	pocket_local_id = '';
	pocket_devices = [];
	pocket_oCode = '';
	pocket_role = [];
	pocket_members = [];
	cong_id = '';
	cong_name = '';
	cong_number = '';
	mfaEnabled = false;
	username = '';
	global_role = '';
	sessions = [];
	last_seen;
	auth_uid = '';
	emailVerified = false;
	disabled = true;
	secret = '';

	constructor() {}

	loadDetails = async (id) => {
		const userRef = db.collection('users').doc(id);
		const userSnap = await userRef.get();

		const user = new User();
		user.id = id;
		user.username = userSnap.data().about.name;
		user.user_uid = userSnap.data().about?.user_uid?.toLowerCase() || '';
		user.secret = userSnap.data().about?.secret || '';
		user.sessions = userSnap.data().about?.sessions || [];
		user.global_role = userSnap.data().about.role;
		user.mfaEnabled = userSnap.data().about?.mfaEnabled || false;
		user.cong_id = userSnap.data().congregation?.id || '';
		user.cong_role = userSnap.data().congregation?.role || [];

		if (user.global_role === 'pocket') {
			user.pocket_local_id = userSnap.data().congregation?.local_id || '';
			user.pocket_devices = userSnap.data().congregation?.devices || [];
			user.pocket_oCode = userSnap.data().congregation?.oCode || '';
			user.pocket_role = userSnap.data().congregation?.pocket_role || [];
			user.pocket_members = userSnap.data().congregation?.pocket_members || [];
		} else {
			const userRecord = await getAuth().getUserByEmail(user.user_uid);
			user.auth_uid = userRecord.uid;
			user.emailVerified = userRecord.emailVerified;
			user.disabled = userRecord.disabled;
		}

		if (user.cong_id.length > 0) {
			const congRef = db.collection('congregations').doc(user.cong_id);
			const docSnap = await congRef.get();
			user.cong_name = docSnap.data().cong_name || '';
			user.cong_number = docSnap.data().cong_number || '';
		}

		let lastSeens = user.sessions.map((session) => {
			return { last_seen: session.sws_last_seen };
		});

		lastSeens.sort((a, b) => {
			return a.last_seen > b.last_seen ? -1 : 1;
		});

		user.last_seen = lastSeens[0]?.last_seen || undefined;

		return user;
	};

	updateFullname = async (value) => {
		try {
			await db.collection('users').doc(this.id).update({ 'about.name': value });
			this.username = value;
		} catch (error) {
			throw new Error(error.message);
		}
	};

	updatePassword = async (value) => {
		try {
			await getAuth().updateUser(this.auth_uid, { password: value });
		} catch (error) {
			throw new Error(error.message);
		}
	};

	getActiveSessions = () => {
		const result = this.sessions.map((session) => {
			let obj = {
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

			return obj;
		});

		return result;
	};

	revokeSession = async (visitorID) => {
		try {
			const newSessions = this.sessions.filter(
				(session) => session.visitorid !== visitorID
			);

			await db
				.collection('users')
				.doc(this.id)
				.update({ 'about.sessions': newSessions });

			return this.getUserActiveSession();
		} catch (error) {
			throw new Error(error.message);
		}
	};

	removeExpiredSession = async () => {
		try {
			const currentDate = new Date().getTime();
			let validSessions = this.sessions.filter(
				(session) => session.expires > currentDate
			);

			await db
				.collection('users')
				.doc(this.id)
				.update({ 'about.sessions': validSessions });

			this.sessions = validSessions;
		} catch (error) {
			throw new Error(error.message);
		}
	};

	updateSessions = async (sessions) => {
		try {
			await db
				.collection('users')
				.doc(this.id)
				.update({ 'about.sessions': sessions });

			this.sessions = sessions;
		} catch (error) {
			throw new Error(error.message);
		}
	};

	enableMFA = async () => {
		try {
			await db
				.collection('users')
				.doc(this.id)
				.update({ 'about.mfaEnabled': true });

			this.mfaEnabled = true;
		} catch (error) {
			throw new Error(error.message);
		}
	};

	logout = async (visitorID) => {
		try {
			await this.revokeSession(visitorID);
		} catch (error) {
			throw new Error(error.message);
		}
	};

	generateSecret = async (email) => {
		try {
			const secret = twofactor.generateSecret({
				name: 'sws2apps',
				account: email,
			});

			const encryptedData = encryptData(secret);

			// save secret
			await db
				.collection('users')
				.doc(id)
				.update({ 'about.secret': encryptedData });

			this.secret = encryptedData;
			return secret;
		} catch (error) {
			throw new Error(error.message);
		}
	};

	decryptSecret = () => {
		try {
			const decryptedData = decryptData(this.secret);
			return JSON.parse(decryptedData);
		} catch (error) {
			throw new Error(error.message);
		}
	};

	updatePocketDevices = async (devices) => {
		try {
			await db.collection('users').doc(this.id).update({
				'congregation.oCode': FieldValue.delete(),
				'congregation.devices': devices,
			});

			this.pocket_oCode = '';
			this.pocket_devices = devices;

			return this;
		} catch (error) {
			throw new Error(error.message);
		}
	};

	removeCongregation = async () => {
		try {
			await db
				.collection('users')
				.doc(this.id)
				.update({ congregation: FieldValue.delete() });
		} catch (error) {
			throw new Error(error.message);
		}
	};
}
