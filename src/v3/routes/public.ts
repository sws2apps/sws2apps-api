import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getSchedules } from '../controllers/public_controller.js';
import { i18n } from '../config/i18n_config.js';
import { MailClient } from '../config/mail_config.js';

const router = express.Router();

// get updated and latest schedules
router.get('/source-material/:language', getSchedules);

router.get('/send-email', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const t = i18n('E');

		const assetsPath = path.join(path.resolve(), '/src/v3/views/assets/logo.png');

		const options = {
			to: 'rhahao.vj@gmail.com',
			subject: t('welcomeCPESubject'),
			template: 'welcome',
			context: {
				welcomeCPETemplate: t('welcomeCPETemplate', { name: 'Test name', congregation: 'Test congregation' }),
				emailFooter: t('emailFooter'),
			},
			attachments: [
				{
					content: fs.readFileSync(assetsPath),
					cid: 'img:logo', //same cid value as in the html img src
				},
			],
		};

		MailClient.sendEmail(options, 'Welcome message sent to user');

		res.status(200).json({ message: 'EMAIL_SENT' });
	} catch (err) {
		next(err);
	}
});

export default router;
