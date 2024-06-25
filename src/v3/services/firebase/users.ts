import * as OTPAuth from 'otpauth';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
	RequestPasswordLessLinkParams,
	UserCongregationAssignDbParams,
	UserNewParams,
	UserRecordType,
	UserSession,
} from '../../denifition/user.js';
import { encryptData } from '../encryption/encryption.js';
import { sendPasswordlessLinkSignIn } from '../mail/sendEmail.js';
import { OTPSecretType } from '../../denifition/app.js';
import { UsersList } from '../../classes/Users.js';

const db = getFirestore(); //get default database

export const dbUserLoadDetails = async (userId: string) => {
	const userRef = db.collection('users_v3').doc(userId);
	const userSnaphot = await userRef.get();
	const userRecord = userSnaphot.data() as UserRecordType;

	const lastSeens =
		userRecord.about.sessions?.map((session) => {
			return session.sws_last_seen;
		}) || [];

	lastSeens.sort((a, b) => {
		return new Date(a) > new Date(b) ? -1 : 1;
	});

	const last_seen = lastSeens[0];

	return { ...userRecord, last_seen };
};

export const dbUserAuthDetails = async (auth_uid: string) => {
	const userRecord = await getAuth().getUser(auth_uid);

	const auth_provider = userRecord.providerData[0]?.providerId || 'email';

	return { ...userRecord, auth_provider };
};

export const dbUserUpdateEmail = async (auth_uid: string, email: string) => {
	await getAuth().updateUser(auth_uid, { email });
};

export const dbUserUpdateFirstname = async (userId: string, firstname: string) => {
	const data = { firstname, updatedAt: new Date().toISOString() };

	await db.collection('users_v3').doc(userId).update({
		'about.firstname.value': data.firstname,
		'about.firstname.updatedAt': data.updatedAt,
	});

	return data;
};

export const dbUserUpdateLastname = async (userId: string, lastname: string) => {
	const data = { lastname, updatedAt: new Date().toISOString() };

	await db.collection('users_v3').doc(userId).update({
		'about.lastname.value': data.lastname,
		'about.lastname.updatedAt': data.updatedAt,
	});

	return data;
};

export const dbUserUpdateSessions = async (userId: string, sessions: UserSession[]) => {
	await db.collection('users_v3').doc(userId).update({ 'about.sessions': sessions });
};

export const dbUserEnableMFA = async (userId: string) => {
	await db.collection('users_v3').doc(userId).update({ 'about.mfaEnabled': true });

	return true;
};

export const dbUserDisableMFA = async (userId: string) => {
	await db.collection('users_v3').doc(userId).update({ 'about.secret': FieldValue.delete(), 'about.mfaEnabled': false });

	return false;
};

export const dbUserGenerateSecret = async (userId: string, user_email: string) => {
	const isProd = process.env.NODE_ENV === 'production';

	const tempSecret = new OTPAuth.Secret().base32;

	const totp = new OTPAuth.TOTP({
		issuer: isProd ? 'sws2apps' : 'sws2apps-test',
		label: user_email,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(tempSecret),
	});

	const secret: OTPSecretType = { secret: tempSecret, uri: totp.toString(), version: 2 };

	const encryptedData = encryptData(JSON.stringify(secret));

	// save secret
	await db.collection('users_v3').doc(userId).update({ 'about.secret': encryptedData });

	return encryptedData;
};

export const dbUserCreate = async (params: UserNewParams) => {
	const { auth_uid, firstname, lastname, email } = params;

	if (email) {
		await getAuth().updateUser(auth_uid, { email });
	}

	const data = {
		about: {
			firstname: { value: firstname, updatedAt: new Date().toISOString() },
			lastname: { value: lastname, updatedAt: new Date().toISOString() },
			role: 'vip',
			auth_uid: auth_uid,
		},
	};

	const { id } = await db.collection('users_v3').add(data);

	return id;
};

export const dbUserGeneratePasswordLessLink = async (params: RequestPasswordLessLinkParams) => {
	const { email, language, origin } = params;

	const isDev = process.env.NODE_ENV === 'development';

	const localUser = UsersList.findByEmail(email);

	if (!localUser) {
		const users = await getAuth().getUsers([{ email }]);

		if (users.users.length === 0) {
			await getAuth().createUser({ email });
		}
	}

	const user = await getAuth().getUserByEmail(email);
	const token = await getAuth().createCustomToken(user.uid);

	const link = `${origin}/#/?code=${token}`;

	if (isDev) return link;

	sendPasswordlessLinkSignIn(email, link, language);
};

export const dbUserCongregationAssign = async (params: UserCongregationAssignDbParams) => {
	const { congId, role, userId } = params;

	const data = { congregation: { id: congId, role } };
	await db.collection('users_v3').doc(userId).set(data, { merge: true });
};

export const dbUserDecodeIdToken = async (idToken: string) => {
	try {
		const decodedToken = await getAuth().verifyIdToken(idToken);
		return decodedToken.uid;
	} catch (err) {
		console.error('Failed to decode idToken');
	}
};
