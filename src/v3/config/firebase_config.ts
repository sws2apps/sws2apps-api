import { initializeApp, cert, AppOptions } from 'firebase-admin/app';
import { env } from '../../config/env.js';

const storageBucket = env.firebaseStorageBucket || `${env.firebaseAppName}.${env.firebaseStorageSuffix}`;

const options = { projectId: env.firebaseAppName, storageBucket } as AppOptions;

if (env.googleConfigBase64) {
	options.credential = cert(JSON.parse(Buffer.from(env.googleConfigBase64, 'base64').toString('utf8')));
}

initializeApp(options);
