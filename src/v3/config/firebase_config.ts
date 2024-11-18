import { initializeApp, cert } from 'firebase-admin/app';

const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64!, 'base64').toString('ascii'));

initializeApp({
	projectId: process.env.FIREBASE_APP_NAME,
	credential: cert(serviceAccount),
	storageBucket: `${process.env.FIREBASE_APP_NAME}.firebasestorage.app`,
});
