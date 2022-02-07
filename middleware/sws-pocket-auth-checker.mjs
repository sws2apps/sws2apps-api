// app dependencies
import { getFirestore } from 'firebase-admin/firestore';

// get firestore
const db = getFirestore();

export const pocketAuthChecker = () => {
	return async (req, res, next) => {
		try {
			const congID = req.headers.cong_id;
			const congNum = req.headers.cong_num;
			const userPIN = req.headers.user_pin;

			let statusCode;
			let statusMsg;

			if (congID && congNum && userPIN) {
				const congRef = db.collection('congregation_data').doc(congID);
				const docSnap = await congRef.get();

				if (docSnap.exists) {
					const isValidNum = docSnap.data().congNumber === congNum;
					if (isValidNum) {
						const pocketUsers = docSnap.data().pocketUsers;
						const findIndex = pocketUsers.findIndex(
							(user) => user.PIN === +userPIN
						);

						if (findIndex === -1) {
							statusCode = 403;
							statusMsg = 'FORBIDDEN';
							res.locals.type = 'warn';
							res.locals.message = 'access denied: not a congregation user';
						} else {
							statusCode = 200;
							res.locals.type = 'info';
							res.locals.message = 'connected successfully to a congregation';
						}
					} else {
						statusCode = 403;
						statusMsg = 'FORBIDDEN';
						res.locals.type = 'warn';
						res.locals.message = 'access denied: incorrect congregation number';
					}
				} else {
					statusCode = 403;
					statusMsg = 'FORBIDDEN';
					res.locals.type = 'warn';
					res.locals.message = 'access denied: incorrect congregation ID';
				}
			} else {
				statusCode = 400;
				statusMsg = 'MISSING_INFO';
				res.locals.type = 'warn';
				res.locals.message = 'access denied: credentials missing';
			}

			if (statusCode === 200) {
				next();
			} else {
				res.locals.failedLoginAttempt = true;
				res.status(statusCode).json({ message: statusMsg });
			}
		} catch (err) {
			next(err);
		}
	};
};
