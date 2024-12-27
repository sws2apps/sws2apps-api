import { initializeApp, cert } from 'firebase-admin/app';

const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64!, 'base64').toString('ascii'));

const suffix = process.env.FIREBASE_STORAGE_SUFFIX || 'firebasestorage.app';

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_APP_NAME}.${suffix}`;

initializeApp({
	projectId: process.env.FIREBASE_APP_NAME,
	credential: cert(serviceAccount),
	storageBucket,
});
