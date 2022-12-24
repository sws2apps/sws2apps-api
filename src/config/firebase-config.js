import { initializeApp, cert } from 'firebase-admin/app';

if (process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST) {
  initializeApp({ projectId: 'dev-sws2apps' });
} else {
  const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, 'base64').toString('ascii'));
  initializeApp({
    credential: cert(serviceAccount),
  });
}
