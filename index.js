// dependency
import 'dotenv/config';

// app import
import app from './src/app.js';

// load utils
import { logger } from './src/utils/logger.js';

const PORT = process.env.PORT || 8000;
const APP_VERSION = process.env.npm_package_version;

app.listen(PORT, () => {
	logger(
		'info',
		JSON.stringify({ details: `server up and running (v${APP_VERSION})` })
	);
});
