import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { formatError } from '../../http/validation-errors.js';
import type { AppRoleType } from '../../domain/users/app-role.js';
import {
	isJoinRequestApprovalEmailEnabled,
	sendJoinRequestApprovalEmail,
} from './congregation-administration-notifications.service.js';
import {
	CongregationAdministrationSecurityError,
	deleteAuthorizedCongregation,
	getCongregationAccessCode,
	getCongregationMasterKey,
	saveCongregationAccessCode,
	saveCongregationMasterKey,
} from './congregation-administration-security.service.js';
import {
	CongregationAdministrationUserError,
	addCongregationUser,
	createCongregationPocketUser,
	deleteCongregationUserPocketCode,
	findEligibleCongregationUser,
	getCongregationMembers,
	removeCongregationUser,
	revokeCongregationUserSession,
	setCongregationAdministratorPersonUid,
	updateCongregationUser,
} from './congregation-administration-users.service.js';
import {
	approveCongregationJoinRequest,
	CongregationJoinRequestError,
	declineCongregationJoinRequest,
} from './congregation-administration-join-requests.service.js';

const handleCongregationSecurityError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof CongregationAdministrationSecurityError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return true;
	}

	if (error.code === 'INVALID_MASTER_KEY') {
		res.locals.message = 'congregation admin provided invalid master key for deletion';
		res.status(403).json({ message: 'error_app_security_invalid-master-key' });
		return true;
	}

	res.locals.message = 'user not authorized to access the provided congregation';
	res.status(403).json({ message: 'error_api_unauthorized-request' });
	return true;
};

const handleCongregationUserError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof CongregationAdministrationUserError)) return false;

	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });
		return true;
	}

	if (error.code === 'MEMBERSHIP_REQUIRED') {
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
		return true;
	}

	res.locals.message = 'no user could found with the provided id';
	res.status(404).json({ message: 'USER_NOT_FOUND' });
	return true;
};

const handleJoinRequestError = (error: unknown, res: Response): boolean => {
	if (!(error instanceof CongregationJoinRequestError)) return false;
	res.locals.type = 'warn';

	if (error.code === 'CONGREGATION_NOT_FOUND') {
		res.locals.message = 'no congregation could not be found with the provided id';
		res.status(404).json({ message: 'error_app_congregation_not-found' });
	} else if (error.code === 'MEMBERSHIP_REQUIRED') {
		res.locals.message = 'user not authorized to access the provided congregation';
		res.status(403).json({ message: 'error_api_unauthorized-request' });
	} else if (error.code === 'USER_NOT_FOUND') {
		res.locals.message = 'no user record found with the provided id';
		res.status(404).json({ message: 'error_app_join-requests-user-not-found' });
	} else {
		res.locals.message = 'user already have a congregation';
		res.status(400).json({ message: 'error_app_join-requests-invalid' });
	}

	return true;
};

export const setCongregationMasterKey = async (req: Request, res: Response) => {
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
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	try {
		await saveCongregationMasterKey(
			id,
			res.locals.currentUser.id,
			req.body.cong_master_key as string,
		);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin set master key';
	res.status(200).json({ message: 'MASTER_KEY_SAVED' });
};

export const setCongregationAccessCode = async (req: Request, res: Response) => {
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
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	try {
		await saveCongregationAccessCode(
			id,
			res.locals.currentUser.id,
			req.body.cong_access_code as string,
		);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin set password';
	res.status(200).json({ message: 'PASSWORD_SAVED' });
};

export const congregationMasterKeyGet = async (req: Request, res: Response) => {
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
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	let masterKey;
	try {
		masterKey = getCongregationMasterKey(id, res.locals.currentUser.id);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin get master key';
	res.status(200).json({ message: masterKey });
};

export const congregationAccessCodeGet = async (req: Request, res: Response) => {
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
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	let accessCode;
	try {
		accessCode = getCongregationAccessCode(id, res.locals.currentUser.id);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin get access code';
	res.status(200).json({ message: accessCode });
};

export const pocketUserAdd = async (req: Request, res: Response) => {
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
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	const { user_firstname, user_lastname, cong_role, cong_person_uid, user_secret_code } = req.body;
	let congregationMembers;
	try {
		congregationMembers = await createCongregationPocketUser(
			id,
			res.locals.currentUser.id,
			req.signedCookies.visitorid,
			{
				firstname: user_firstname,
				lastname: user_lastname,
				roles: cong_role,
				personUid: cong_person_uid,
				secretCode: user_secret_code,
			},
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin added pocket user';
	res.status(200).json(congregationMembers);
};

export const congregationGetUsers = async (req: Request, res: Response) => {
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
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	let congregationMembers;
	try {
		congregationMembers = getCongregationMembers(
			id,
			res.locals.currentUser.id,
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin fetched all users';
	res.status(200).json(congregationMembers);
};

export const userDetailsUpdate = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { id, user } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation user params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	const { user_secret_code, cong_role, cong_person_uid, cong_person_delegates, first_name, last_name } = req.body;
	let congregationMembers;
	try {
		congregationMembers = await updateCongregationUser(
			id,
			res.locals.currentUser.id,
			user,
			req.signedCookies.visitorid,
			{
				secretCode: user_secret_code,
				roles: cong_role,
				personUid: cong_person_uid,
				personDelegates: cong_person_delegates,
				firstname: first_name,
				lastname: last_name,
			},
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin updated user details';
	res.status(200).json(congregationMembers);
};

export const userSessionDelete = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { id, user } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation user params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	const identifier = req.body.identifier as string;
	let congregationMembers;
	try {
		congregationMembers = await revokeCongregationUserSession(
			id,
			res.locals.currentUser.id,
			user,
			req.signedCookies.visitorid,
			identifier,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin terminated user session';
	res.status(200).json(congregationMembers);
};

export const pocketCodeDelete = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { id, user } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation user params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	let congregationMembers;
	try {
		congregationMembers = await deleteCongregationUserPocketCode(
			id,
			res.locals.currentUser.id,
			user,
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin deleted user invitation code';
	res.status(200).json(congregationMembers);
};

export const globalSearchUser = async (req: Request, res: Response) => {
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
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	const email = req.query.email as string;
	let foundUser;
	try {
		foundUser = findEligibleCongregationUser(id, res.locals.currentUser.id, email);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin got global user';
	res.status(200).json(foundUser);
};

export const congregationUserAdd = async (req: Request, res: Response) => {
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
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	const { user_firstname, user_lastname, cong_role, cong_person_uid, user_id } = req.body;
	let congregationMembers;
	try {
		congregationMembers = await addCongregationUser(
			id,
			res.locals.currentUser.id,
			req.signedCookies.visitorid,
			{
				userId: user_id,
				firstname: user_firstname,
				lastname: user_lastname,
				roles: cong_role,
				personUid: cong_person_uid,
			},
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin added vip user';
	res.status(200).json(congregationMembers);
};

export const congregationDeleteUser = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({ message: 'error_api_bad-request' });

		return;
	}

	const { id, user } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'CONG_ID_INVALID' });

		return;
	}

	if (!user) {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation user params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	let congregationMembers;
	try {
		congregationMembers = await removeCongregationUser(
			id,
			res.locals.currentUser.id,
			user,
			req.signedCookies.visitorid,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin removed user from congregation';
	res.status(200).json(congregationMembers);
};

export const setAdminUserUid = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	try {
		await setCongregationAdministratorPersonUid(
			id,
			res.locals.currentUser.id,
			req.body.user_uid as string,
		);
	} catch (error) {
		if (!handleCongregationUserError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin set his user uid';
	res.status(200).json({ message: 'USER_UID_SET' });
};

export const deleteCongregation = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	try {
		await deleteAuthorizedCongregation(
			id,
			res.locals.currentUser.id,
			req.body.key as string,
		);
	} catch (error) {
		if (!handleCongregationSecurityError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin deleted congregation';
	res.status(200).json({ message: 'CONGREGATION_DELETED' });
};

export const deleteJoinRequest = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	const userId = req.headers.user as string;
	let result;
	try {
		result = await declineCongregationJoinRequest(id, res.locals.currentUser.id, userId);
	} catch (error) {
		if (!handleJoinRequestError(error, res)) throw error;
		return;
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin declined a join request';
	res.status(200).json(result);
};

export const acceptJoinRequest = async (req: Request, res: Response) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const msg = formatError(errors);

		res.locals.type = 'warn';
		res.locals.message = `invalid input: ${msg}`;

		res.status(400).json({
			message: 'error_api_bad-request',
		});

		return;
	}

	const { id } = req.params;

	if (!id || id === 'undefined') {
		res.locals.type = 'warn';
		res.locals.message = 'the congregation id params is undefined';
		res.status(400).json({ message: 'error_app_congregation_invalid-id' });

		return;
	}

	const userId = req.headers.user as string;
	const role = req.body.role as AppRoleType[];
	const person_uid = req.body.person_uid as string;
	const firstname = req.body.firstname as string;
	const lastname = req.body.lastname as string;

	let approval;
	try {
		approval = await approveCongregationJoinRequest(
			id,
			res.locals.currentUser.id,
			userId,
			{ roles: role, personUid: person_uid, firstname, lastname },
		);
	} catch (error) {
		if (!handleJoinRequestError(error, res)) throw error;
		return;
	}

	const { recipient: userEmail, requestorName, congregationName, countryCode } = approval.notification;

	if (isJoinRequestApprovalEmailEnabled() && userEmail) {
		const language = (req.headers?.applanguage as string) || 'eng';
		req.i18n.changeLanguage(language);

		const congregation = `${congregationName} (${countryCode})`;

		sendJoinRequestApprovalEmail({
			recipient: userEmail,
			subject: req.t('tr_joinRequestApprovedSubject', { congregation }),
			greeting: req.t('tr_greetings', { name: requestorName }),
			title: req.t('tr_joinRequestApprovedTitle'),
			message: req.t('tr_joinRequestApprovedDesc', {
				congregation,
				url: req.headers.origin!,
			}),
		});
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation admin accepted a join request';
	res.status(200).json(approval.requests);
};
