// dependency
import 'dotenv/config';

// app import
import app from './routes/app.js';

// load utils
import { appVersion } from './utils/server.js';
import { logger } from './utils/logger.js';

const port = process.env.PORT || 8000;

app.listen(port, () => {
	logger('info', `server up and running (v${appVersion})`);
});
