import bcrypt from 'bcrypt';
import Cryptr from 'cryptr';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore();

export const congregationAuthChecker = () => {
	return async (req, res, next) => {
		try {
			const validPaths = ['/signin', '/change-password'];

			if (validPaths.findIndex((path) => path === req.path) >= 0) {
				const uid = req.headers.uid;

				getAuth()
					.getUser(uid)
					.then(async (userRecord) => {
						const email = userRecord.email;
						const congID = req.body.cong_id;
						const congPassword = req.body.cong_password;
						const congName = req.body.cong_name;
						const congNumber = req.body.cong_number;

						const congRef = db
							.collection('congregation_data')
							.doc(congID.toString());
						const docSnap = await congRef.get();

						if (docSnap.exists) {
							// check password
							const hashedPwd = docSnap.data().congPassword;
							bcrypt.compare(congPassword, hashedPwd, async (err, result) => {
								if (result) {
									// check if email can access congregation data
									const vipUsersEncrypted = docSnap.data().vipUsers;
									let vipUsers = [];

									const myKey = congID + '&sws2apps_' + congPassword;
									const cryptr = new Cryptr(myKey);

									for (let i = 0; i < vipUsersEncrypted.length; i++) {
										const decryptedData = cryptr.decrypt(vipUsersEncrypted[i]);
										vipUsers.push(decryptedData);
									}

									const userIndex = vipUsers.findIndex(
										(user) => user === email
									);
									if (userIndex >= 0) {
										// valid and update congregation name, number

										const data = {
											congName: congName,
											congNumber: congNumber,
										};
										await db
											.collection('congregation_data')
											.doc(congID.toString())
											.set(data, { merge: true });

										res.locals.vipUsers = vipUsers;
										next();
									} else {
										// forbbiden
										res.locals.type = 'warn';
										res.locals.message =
											'user do not have access to access that congregation';
										res.status(403).json({ message: 'FORBIDDEN' });
									}
								} else {
									// wrong password
									res.locals.type = 'warn';
									res.locals.message =
										'access denied because congregation password is incorrect.';
									res.status(403).json({ message: 'FORBIDDEN' });
								}
							});
						} else {
							// congregation id not found
							res.locals.type = 'warn';
							res.locals.message = 'congregation id could not be found.';
							res.status(404).json({ message: 'NOT_FOUND' });
						}
					})
					.catch((err) => {
						next(err);
					});
			} else {
				next();
			}
		} catch (err) {
			next(err);
		}
	};
};
