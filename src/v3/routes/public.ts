import express, { NextFunction, Request, Response } from 'express';
import { getSchedules } from '../controllers/public_controller.js';
import { i18n } from '../config/i18n_config.js';
import { MailClient } from '../config/mail_config.js';

const router = express.Router();

// get updated and latest schedules
router.get('/source-material/:language', getSchedules);

router.get('/send-email', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const t = i18n('E');

		const options = {
			to: 'rhahao.vj@gmail.com',
			subject: t('tr_welcomeTitle'),
			template: 'welcome',
			context: {
				welcomeTitle: t('tr_welcomeTitle'),
				welcomeDesc: t('tr_welcomeDesc'),
				watchVideoLabel: t('tr_watchVideoLabel'),
				moreInfoTitle: t('tr_moreInfoTitle'),
				moreInfoGuideLabel: t('tr_moreInfoGuideLabel'),
				moreInfoBlogLabel: t('tr_moreInfoBlogLabel'),
				moreInfoSupportLabel: t('tr_moreInfoSupportLabel'),
				copyright: new Date().getFullYear,
			},
		};

		MailClient.sendEmail(options, 'Welcome message sent to user');

		res.status(200).json({ message: 'EMAIL_SENT' });
	} catch (err) {
		next(err);
	}
});

export default router;
