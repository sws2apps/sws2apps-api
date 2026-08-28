import { getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { serverState } from '../../../platform/runtime/server-state.js';

const db = getFirestore(getApp());

export const updateAPIMinimumClient = async (version: string) => {
	const apiSettings = db.collection('api_settings_v3');

	const snapshot = await apiSettings.limit(1).get();

	const doc = snapshot.docs[0];
	const docRef = doc.ref;

	await docRef.update({ minimum_version: version });

	serverState.minimumAppVersion = version;
};
