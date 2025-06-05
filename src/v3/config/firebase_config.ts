import { initializeApp, cert, AppOptions } from 'firebase-admin/app';

const suffix = process.env.FIREBASE_STORAGE_SUFFIX || 'firebasestorage.app';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_APP_NAME}.${suffix}`;

const options = { projectId: process.env.FIREBASE_APP_NAME, storageBucket } as AppOptions;

if (process.env.GOOGLE_CONFIG_BASE64) {
	options.credential = cert(JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, 'base64').toString('ascii')));
}

initializeApp(options);
