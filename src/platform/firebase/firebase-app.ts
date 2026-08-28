import { initializeApp, cert, AppOptions } from 'firebase-admin/app';
import { env } from '../../config/env.js';
import { decodeServiceAccount } from './service-account.js';

const storageBucket = env.firebaseStorageBucket || `${env.firebaseAppName}.${env.firebaseStorageSuffix}`;

const options = { projectId: env.firebaseAppName, storageBucket } as AppOptions;

if (env.googleConfigBase64) {
	options.credential = cert(decodeServiceAccount(env.googleConfigBase64));
}

initializeApp(options);
