require('../firebase-config'); //load firebase admin SDK
const { getFirestore } = require('firebase-admin/firestore'); //load firestore SDK
const db = getFirestore(); //get default database

module.exports = async (clientIp, data) => {
    if (process.env.NODE_ENV === 'production') {
        const reqTrackRef = db.collection('request_tracker').doc(clientIp);
        const docSnap = await reqTrackRef.get();
        
        let failedLoginAttempt = docSnap.data().failedLoginAttempt;
        failedLoginAttempt = failedLoginAttempt + 1;

        if (data.failedLoginAttempt) {
            data = {...data, failedLoginAttempt: failedLoginAttempt}
        }

        await db.collection('request_tracker').doc(clientIp).set(
            data,
            { merge: true }
        );
    }
}