import { Request, Response } from 'express';
import { UsersList } from '../classes/Users.js';
import { CongregationsList } from '../classes/Congregations.js';
import { adminCongregationsGet } from '../services/api/congregations.js';
import { adminUsersGet } from '../services/api/users.js';
import { validationResult } from 'express-validator';
import { formatError } from '../utils/format_log.js';
import { AppRoleType } from '../definition/app.js';
import { Flags } from '../classes/Flags.js';
import { FeatureFlag } from '../definition/flag.js';
import { adminFlagsGet } from '../services/api/flags.js';

export const validateAdmin = async (req: Request, res: Response) => {
	res.locals.type = 'info';
	res.locals.message = 'administrator successfully logged in';
	res.status(200).json({ message: 'OK' });
};

export const logoutAdmin = async (req: Request, res: Response) => {
	// remove all sessions
	const { id } = res.locals.currentUser;
	const admin = UsersList.findById(id);

	if (admin) await admin.adminLogout();

	res.locals.type = 'info';
	res.locals.message = 'administrator successfully logged out';

	res.clearCookie('visitorid');
	res.status(200).json({ message: 'LOGGED_OUT' });
};

export const getAllCongregations = async (req: Request, res: Response) => {
	const result = await adminCongregationsGet();

	res.locals.type = 'info';
	res.locals.message = 'admin fetched all congregation';
	res.status(200).json(result);
};

export const deleteCongregation = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const cong = CongregationsList.findById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONGREGATION_NOT_FOUND' });
		return;
	}

	if (cong.members.length > 0) {
		res.locals.type = 'warn';
		res.locals.message = 'congregation could not be deleted since there are still users inside';
		res.status(405).json({ message: 'CONG_ACTIVE' });
		return;
	}

	await CongregationsList.delete(id);

	const result = await adminCongregationsGet();

	res.locals.type = 'info';
	res.locals.message = `admin deleted congregation ${id}`;
	res.status(200).json(result);
};

export const congregationPersonsGet = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	const cong = CongregationsList.findById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });

		return;
	}

	const cong_members = cong.getMembers(req.signedCookies.visitorid);

	const cong_persons = cong_members.map((person) => {
		const user = UsersList.findById(person.id);

		return {
			id: person.id,
			sessions: person.sessions,
			profile: {
				...person.profile,
				email: user?.email,
				mfa_enabled: user?.profile.mfa_enabled,
				congregation: { id: cong.id, cong_role: person.profile.cong_role || [] },
			},
		};
	});

	res.locals.type = 'info';
	res.locals.message = 'admin fetched all congregation persons';
	res.status(200).json(cong_persons);
};

export const usersGetAll = async (req: Request, res: Response) => {
	const result = await adminUsersGet(req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = 'admin fetched all users';
	res.status(200).json(result);
};

export const userDelete = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'no user could not be found with the provided id';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	const userCong = user.profile.congregation?.id;

	await UsersList.delete(id);

	if (userCong) {
		const cong = CongregationsList.findById(userCong);

		if (cong) {
			cong.reloadMembers();
		}
	}

	const result = await adminUsersGet(req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = 'admin deleted an user';
	res.status(200).json(result);
};

export const userDisable2FA = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'no user could not be found with the provided id';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	await user.disableMFA();

	const result = await adminUsersGet(req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = 'admin disabled user 2fa';
	res.status(200).json(result);
};

export const userRevokeToken = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'no user could not be found with the provided id';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	await user.revokeToken();

	const result = await adminUsersGet(req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = 'admin revoked user token';
	res.status(200).json(result);
};

export const userUpdate = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'no user could not be found with the provided id';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	const lastname = req.body.lastname as string;
	const firstname = req.body.firstname as string;
	const email = req.body.email as string;
	const roles = req.body.roles as AppRoleType[];

	const lastnameSaved = user.profile.lastname.value;
	const firstnameSaved = user.profile.firstname.value;
	const rolesSave = user.profile.congregation?.cong_role || [];

	const roleUpdate = roles.length === rolesSave.length && roles.every((record) => rolesSave.some((role) => role === record));

	if (lastnameSaved !== lastname || firstnameSaved !== firstname || !roleUpdate) {
		const profile = structuredClone(user.profile);
		profile.firstname.value = firstname;
		profile.lastname.value = lastname;

		if (profile.congregation) {
			profile.congregation.cong_role = roles;
		}

		await user.updateProfile(profile);
	}

	if (email.length > 0 && email !== user.email && user.profile.auth_uid) {
		await user.updateEmailAuth(user.profile.auth_uid, email);
	}

	const userCong = user.profile.congregation?.id;

	if (userCong) {
		const cong = CongregationsList.findById(userCong);

		if (cong) {
			cong.reloadMembers();
		}
	}

	const result = await adminUsersGet(req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = 'admin updated user details';
	res.status(200).json(result);
};

export const userSessionDelete = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'no user could not be found with the provided id';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	const identifiers = req.body.identifiers as string | [];

	const session = identifiers.length === 0 ? [] : identifiers.at(0);

	if (typeof session === 'string') {
		await user.revokeSession(session);
	}

	if (typeof session === 'object') {
		await user.updateSessions([]);
	}

	const userCong = user.profile.congregation?.id;

	if (userCong) {
		const cong = CongregationsList.findById(userCong);

		if (cong) {
			cong.reloadMembers();
		}
	}

	const result = await adminUsersGet(req.signedCookies.visitorid);

	res.locals.type = 'info';
	res.locals.message = 'admin revoked an user session';
	res.status(200).json(result);
};

export const flagsGet = async (req: Request, res: Response) => {
	const result = adminFlagsGet();

	res.locals.type = 'info';
	res.locals.message = 'admin fetched all feature flags';
	res.status(200).json(result);
};

export const flagsCreate = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const name = req.body.name as string;
	const desc = req.body.desc as string;
	const availability = req.body.availability as FeatureFlag['availability'];

	await Flags.create(name, desc, availability);

	const result = adminFlagsGet();

	res.locals.type = 'info';
	res.locals.message = 'admin created new feature flag';
	res.status(200).json(result);
};

export const flagDelete = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the flag request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	await Flags.delete(id);

	const result = adminFlagsGet();

	res.locals.type = 'info';
	res.locals.message = 'admin deleted a feature flag';
	res.status(200).json(result);
};

export const flagUpdate = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the flag request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const flag = Flags.findById(id);

	if (!flag) {
		res.locals.type = 'warn';
		res.locals.message = 'no flag could not be found with the provided id';
		res.status(404).json({ message: 'FLAG_NOT_FOUND' });
		return;
	}

	const name = req.body.name as string;
	const description = req.body.description as string;
	const coverage = req.body.coverage as number;

	const nameSaved = flag.name;
	const descriptionSaved = flag.description;
	const coverageSaved = flag.coverage;

	if (name !== nameSaved || description !== descriptionSaved || coverage !== coverageSaved) {
		await flag.update(name, description, coverage);
	}

	const result = adminFlagsGet();

	res.locals.type = 'info';
	res.locals.message = 'admin updated a feature flag';
	res.status(200).json(result);
};

export const flagToggle = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the flag request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const flag = Flags.findById(id);

	if (!flag) {
		res.locals.type = 'warn';
		res.locals.message = 'no flag could not be found with the provided id';
		res.status(404).json({ message: 'FLAG_NOT_FOUND' });
		return;
	}

	await flag.toggle();

	const result = adminFlagsGet();

	res.locals.type = 'info';
	res.locals.message = 'admin updated feature flag status';
	res.status(200).json(result);
};

export const userFlagToggle = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const user = UsersList.findById(id);

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'no user could not be found with the provided id';
		res.status(404).json({ message: 'USER_NOT_FOUND' });
		return;
	}

	const flagid = req.body.flagid as string;

	const flag = Flags.findById(flagid);

	if (!flag) {
		res.locals.type = 'warn';
		res.locals.message = 'no flag could not be found with the provided id';
		res.status(404).json({ message: 'FLAG_NOT_FOUND' });
		return;
	}

	let userFlags = structuredClone(user.flags);

	const userFlag = userFlags.find((record) => record === flagid);

	if (userFlag) {
		userFlags = userFlags.filter((record) => record !== flagid);
	}

	if (!userFlag) {
		userFlags.push(flagid);
	}

	await user.updateFlags(userFlags);

	const result = adminFlagsGet();

	res.locals.type = 'info';
	res.locals.message = 'admin updated user feature toggle';
	res.status(200).json(result);
};

export const congregationFlagToggle = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const cong = CongregationsList.findById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONG_NOT_FOUND' });
		return;
	}

	const flagid = req.body.flagid as string;

	const flag = Flags.findById(flagid);

	if (!flag) {
		res.locals.type = 'warn';
		res.locals.message = 'no flag could not be found with the provided id';
		res.status(404).json({ message: 'FLAG_NOT_FOUND' });
		return;
	}

	let congFlags = structuredClone(cong.flags);

	const congFlag = congFlags.find((record) => record === flagid);

	if (congFlag) {
		congFlags = congFlags.filter((record) => record !== flagid);
	}

	if (!congFlag) {
		congFlags.push(flagid);
	}

	await cong.saveFlags(congFlags);

	const result = adminFlagsGet();

	res.locals.type = 'info';
	res.locals.message = 'admin updated congregation feature toggle';
	res.status(200).json(result);
};

export const congregationDataSyncToggle = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the user request id params is undefined';
		res.status(400).json({ message: 'REQUEST_ID_INVALID' });

		return;
	}

	const cong = CongregationsList.findById(id);

	if (!cong) {
		res.locals.type = 'warn';
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'CONG_NOT_FOUND' });
		return;
	}

	const settings = structuredClone(cong.settings);
	settings.data_sync = { value: !settings.data_sync.value, updatedAt: new Date().toISOString() };

	await cong.saveSettings(settings);

	const result = await adminCongregationsGet();

	res.locals.type = 'info';
	res.locals.message = `admin updated congregation data sync`;
	res.status(200).json(result);
};
