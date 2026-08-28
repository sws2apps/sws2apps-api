import { getFirestore } from 'firebase-admin/firestore';
import { getApp } from 'firebase-admin/app';
import { serverState } from '../../platform/runtime/server-state.js';

const db = getFirestore(getApp());

export const initializeAPI = async () => {
  try {
    let settingID: string | undefined;

    const apiSettings = db.collection('api_settings_v3');
    const snapshot = await apiSettings.get();
    snapshot.forEach((doc) => {
      settingID = doc.id;
      serverState.minimumAppVersion = doc.data().minimum_version;
    });

    if (!settingID) {
      const data = {
        minimum_version: '1.0.0',
      };

      await db.collection('api_settings_v3').add(data);
      serverState.minimumAppVersion = data.minimum_version;
    }
  } catch (err) {
    throw new Error(String(err), { cause: err });
  }
};
