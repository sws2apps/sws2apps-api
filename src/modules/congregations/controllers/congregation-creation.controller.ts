import type { Request, Response } from 'express';
import { sendClientError, sendSuccess } from '#http/responses.js';
import {
	CongregationCreationError,
	createVerifiedCongregation,
} from '../services/congregation-creation.service.js';
import {
	isWelcomeEmailEnabled,
	sendWelcomeEmail,
} from '../services/congregation-notifications.service.js';

export const createCongregation = async (req: Request, res: Response) => {
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

		if (error.code === 'CONGREGATION_EXISTS') {
			sendClientError(res, 404, 'CONG_EXISTS', 'the congregation requested already exists');
		} else if (error.code === 'DIRECTORY_FETCH_FAILED') {
			sendClientError(res, error.statusCode!, 'REQUEST_NOT_VALIDATED', 'an error occured while verifying the congregation data');
		} else {
			sendClientError(res, 400, 'BAD_REQUEST', 'this request does not match any valid congregation');
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

	sendSuccess(res, creation.response, 'congregation created successfully');
};
