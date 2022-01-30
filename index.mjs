// dependency
import 'dotenv/config';

// app import
import app from './routes/app.mjs';

// load utils
import { appVersion } from './utils/server.mjs';
import { logger } from './utils/logger.mjs';

const port = process.env.PORT || 8000;

app.listen(port, () => {
	logger('info', `server up and running (v${appVersion})`);
});
