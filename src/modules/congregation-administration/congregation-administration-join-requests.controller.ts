import type { Request, Response } from 'express';

import type { AppRoleType } from '#domain/users/app-role.js';
import {
	approveCongregationJoinRequest,
	CongregationJoinRequestError,
	declineCongregationJoinRequest,
} from './congregation-administration-join-requests.service.js';
import {
	isJoinRequestApprovalEmailEnabled,
	sendJoinRequestApprovalEmail,
} from './congregation-administration-notifications.service.js';

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

export const deleteJoinRequest = async (req: Request, res: Response) => {
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

