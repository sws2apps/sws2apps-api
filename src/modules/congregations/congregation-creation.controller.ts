import type { Request, Response } from 'express';

import { rejectInvalidRequest } from '../../http/validation-errors.js';
import {
	CongregationCreationError,
	createVerifiedCongregation,
} from './congregation-creation.service.js';
import {
	isWelcomeEmailEnabled,
	sendWelcomeEmail,
} from './congregation-notifications.service.js';

export const createCongregation = async (req: Request, res: Response) => {
	if (rejectInvalidRequest(req, res)) return;

	const { country_code, country_guid, cong_name, firstname, lastname } = req.body as Record<string, string>;
	const language = (req.headers.language as string) || 'eng';
	let creation;

	try {
		creation = await createVerifiedCongregation({
			userId: res.locals.currentUser.id,
			countryCode: country_code,
			countryGuid: country_guid,
			congregationName: cong_name,
			firstname,
			lastname,
			language,
		});
	} catch (error) {
		if (!(error instanceof CongregationCreationError)) throw error;

		res.locals.type = 'warn';
		if (error.code === 'CONGREGATION_EXISTS') {
			res.locals.message = 'the congregation requested already exists';
			res.status(404).json({ message: 'CONG_EXISTS' });
		} else if (error.code === 'DIRECTORY_FETCH_FAILED') {
			res.locals.message = 'an error occured while verifying the congregation data';
			res.status(error.statusCode!).json({ message: 'REQUEST_NOT_VALIDATED' });
		} else {
			res.locals.message = 'this request does not match any valid congregation';
			res.status(400).json({ message: 'BAD_REQUEST' });
		}
		return;
	}

	if (isWelcomeEmailEnabled()) {
		req.i18n.changeLanguage(language);

		sendWelcomeEmail({
			recipient: creation.notificationRecipient,
			subject: req.t('tr_welcomeTitle'),
			welcomeTitle: req.t('tr_welcomeTitle'),
			welcomeDescription: req.t('tr_welcomeDesc'),
			watchVideoLabel: req.t('tr_watchVideoLabel'),
			moreInformationTitle: req.t('tr_moreInfoTitle'),
			guideLabel: req.t('tr_moreInfoGuideLabel'),
			blogLabel: req.t('tr_moreInfoBlogLabel'),
			supportLabel: req.t('tr_moreInfoSupportLabel'),
		});
	}

	res.locals.type = 'info';
	res.locals.message = 'congregation created successfully';
	res.status(200).json(creation.response);
};

