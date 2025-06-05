import { initializeApp, cert } from 'firebase-admin/app';

const credential = process.env.GOOGLE_CONFIG_BASE64
	? cert(JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, 'base64').toString('ascii')))
	: undefined;

const suffix = process.env.FIREBASE_STORAGE_SUFFIX || 'firebasestorage.app';

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_APP_NAME}.${suffix}`;

initializeApp({
	projectId: process.env.FIREBASE_APP_NAME,
	credential,
	storageBucket,
});
