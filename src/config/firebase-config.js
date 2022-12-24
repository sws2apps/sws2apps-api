import { initializeApp, cert } from 'firebase-admin/app';

const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, 'base64').toString('ascii'));

if (process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST) {
  initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
} else {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
