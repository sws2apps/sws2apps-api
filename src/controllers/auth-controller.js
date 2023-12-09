// import dependencies
import { getAuth } from 'firebase-admin/auth';
import { validationResult } from 'express-validator';
import { users } from '../classes/Users.js';
import { retrieveVisitorDetails } from '../utils/auth-utils.js';
import { generateTokenDev } from '../dev/setup.js';
import { congregations } from '../classes/Congregations.js';

export const loginUser = async (req, res, next) => {
	try {
		const userIP = req.clientIp;
		const userAgent = req.headers['user-agent'];
		const isDev = process.env.NODE_ENV === 'development';

		// validate through express middleware
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const visitorid = isNaN(req.body.visitorid) ? req.body.visitorid : +req.body.visitorid;
		const { uid } = req.headers;

		let authUser = users.findUserByAuthUid(uid);

		const expiryDate = new Date().getTime() + 24 * 60 * 60000; // expired after 1 day
		let newSessions = [];
		let isNewUser = false;

		if (authUser) {
			await authUser.removeExpiredSession();
			newSessions = authUser.sessions.filter((session) => session.visitorid !== visitorid);
		}

		if (!authUser) {
			const userRecord = await getAuth().getUser(uid);
			const displayName = userRecord.displayName || userRecord.providerData[0].displayName;
			let firstName = '';
			let lastName = '';
			if (displayName.length > 0) {
				const names = displayName.split(' ');
				lastName = names.pop();
				firstName = names.join(' ');
			}
			authUser = await users.create(uid, firstName, lastName);
			isNewUser = true;
		}

		const newSession = {
			visitorid: visitorid,
			visitor_details: await retrieveVisitorDetails(userIP, userAgent),
			expires: expiryDate,
		};

		if (authUser.mfaEnabled) newSession.mfaVerified = false;

		newSessions.push(newSession);

		await authUser.updateSessions(newSessions);

		if (authUser.mfaEnabled) {
			res.locals.type = 'info';
			res.locals.message = 'user required to verify mfa';

			if (isDev) {
				const tokenDev = generateTokenDev(authUser.user_uid, authUser.secret);
				console.log(`Please use this OTP code to complete your login: ${tokenDev}`);
			}

			res.status(200).json({ message: 'MFA_VERIFY' });
		} else {
			// mfa not enabled
			const newSessions = authUser.sessions.map((session) => {
				if (session.visitorid === visitorid) {
					return {
						...session,
						sws_last_seen: new Date().getTime(),
					};
				} else {
					return session;
				}
			});

			await authUser.updateSessions(newSessions);

			const userInfo = {
				id: authUser.id,
				username: authUser.username,
				cong_name: authUser.cong_name,
				cong_number: authUser.cong_number,
				cong_role: authUser.cong_role,
				cong_id: authUser.cong_id,
				global_role: authUser.global_role,
				user_local_uid: authUser.user_local_uid,
				user_members_delegate: authUser.user_members_delegate,
				mfa: 'not_enabled',
				is_new_user: isNewUser,
			};

			const cong = congregations.findCongregationById(authUser.cong_id);
			if (cong) {
				userInfo.cong_encryption = cong.cong_encryption;

				const isPublisher = cong.isPublisher(authUser.user_local_uid);
				const isMS = cong.isMS(authUser.user_local_uid);
				const isElder = cong.isElder(authUser.user_local_uid);

				if (isElder) userInfo.cong_role.push('elder');
				if (isMS) userInfo.cong_role.push('ms');
				if (isPublisher) userInfo.cong_role.push('publisher');
				const lmmoRole = authUser.cong_role.includes('lmmo') || authUser.cong_role.includes('lmmo-backup');
				const secretaryRole = authUser.cong_role.includes('secretary');
				const coordinatorRole = authUser.cong_role.includes('coordinator');
				const publicTalkCoordinatorRole = authUser.cong_role.includes('public_talk_coordinator');

				// retrieve congregation persons records if elder
				if (isElder && !lmmoRole && !secretaryRole && !coordinatorRole && !publicTalkCoordinatorRole) {
					const backupData = cong.retrieveBackup();
					userInfo.cong_persons = backupData.cong_persons;
				}

				// retrieve latest field service reports if publisher
				const publisherRole = isElder || isMS || isPublisher;
				if (publisherRole) {
					const backupData = authUser.retrieveBackup();
					userInfo.user_fieldServiceReports = backupData.user_fieldServiceReports;
				}
			}

			res.locals.type = 'info';
			res.locals.message = 'user successfully logged in without MFA';
			res.status(200).json(userInfo);
		}
	} catch (err) {
		next(err);
	}
};

export const createSignInLink = async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { email, uid } = req.body;
		const language = req.headers.applanguage || 'e';

		const devLink = await users.createPasswordlessLink(email, uid, language, req.headers.origin);

		res.locals.type = 'info';
		res.locals.message = 'passwordless link will be sent to user';
		res.status(200).json(devLink ? { link: devLink } : { message: 'SIGNIN_LINK_SEND' });
	} catch (err) {
		next(err);
	}
};

export const verifyPasswordlessInfo = async (req, res, next) => {
	const userIP = req.clientIp;
	const userAgent = req.headers['user-agent'];
	const isDev = process.env.NODE_ENV === 'development';

	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let msg = '';
			errors.array().forEach((error) => {
				msg += `${msg === '' ? '' : ', '}${error.path}: ${error.msg}`;
			});

			res.locals.type = 'warn';
			res.locals.message = `invalid input: ${msg}`;

			res.status(400).json({
				message: 'Bad request: provided inputs are invalid.',
			});

			return;
		}

		const { email, visitorid, fullname } = req.body;
		const { uid } = req.headers;

		let authUser = users.findUserByAuthUid(uid);

		const expiryDate = new Date().getTime() + 24 * 60 * 60000; // expired after 1 day
		let newSessions = [];

		if (authUser) {
			await authUser.removeExpiredSession();
			newSessions = authUser.sessions.filter((session) => session.visitorid !== visitorid);
		}

		if (!authUser) {
			authUser = await users.createPasswordless(email, uid, fullname);
		}

		const newSession = {
			visitorid: visitorid,
			visitor_details: await retrieveVisitorDetails(userIP, userAgent),
			expires: expiryDate,
		};

		if (authUser.mfaEnabled) newSession.mfaVerified = false;

		newSessions.push(newSession);

		await authUser.updateSessions(newSessions);

		if (authUser.mfaEnabled) {
			res.locals.type = 'info';
			res.locals.message = 'user required to verify mfa';

			if (isDev) {
				const tokenDev = generateTokenDev(authUser.user_uid, authUser.secret);
				console.log(`Please use this OTP code to complete your login: ${tokenDev}`);
			}

			res.status(200).json({ message: 'MFA_VERIFY' });
		} else {
			// mfa not enabled
			const newSessions = authUser.sessions.map((session) => {
				if (session.visitorid === visitorid) {
					return {
						...session,
						sws_last_seen: new Date().getTime(),
					};
				} else {
					return session;
				}
			});

			await authUser.updateSessions(newSessions);

			const userInfo = {
				id: authUser.id,
				username: authUser.username,
				cong_name: authUser.cong_name,
				cong_number: authUser.cong_number,
				cong_role: authUser.cong_role,
				cong_id: authUser.cong_id,
				global_role: authUser.global_role,
				user_local_uid: authUser.user_local_uid,
				user_members_delegate: authUser.user_members_delegate,
				mfa: 'not_enabled',
			};

			const cong = congregations.findCongregationById(authUser.cong_id);
			if (cong) {
				const isPublisher = cong.isPublisher(authUser.user_local_uid);
				const isMS = cong.isMS(authUser.user_local_uid);
				const isElder = cong.isElder(authUser.user_local_uid);

				if (isElder) userInfo.cong_role.push('elder');
				if (isMS) userInfo.cong_role.push('ms');
				if (isPublisher) userInfo.cong_role.push('publisher');

				const lmmoRole = authUser.cong_role.includes('lmmo') || authUser.cong_role.includes('lmmo-backup');
				const secretaryRole = authUser.cong_role.includes('secretary');
				const coordinatorRole = authUser.cong_role.includes('coordinator');
				const publicTalkCoordinatorRole = authUser.cong_role.includes('public_talk_coordinator');

				// retrieve congregation persons records if elder
				if (isElder && !lmmoRole && !secretaryRole && !coordinatorRole && !publicTalkCoordinatorRole) {
					const backupData = cong.retrieveBackup();
					userInfo.cong_persons = backupData.cong_persons;
				}

				// retrieve latest field service reports if publisher
				const publisherRole = isElder || isMS || isPublisher;
				if (publisherRole) {
					const backupData = authUser.retrieveBackup();
					userInfo.user_fieldServiceReports = backupData.user_fieldServiceReports;
				}
			}

			res.locals.type = 'info';
			res.locals.message = 'user successfully logged in without MFA';
			res.status(200).json(userInfo);
		}
	} catch (err) {
		next(err);
	}
};
