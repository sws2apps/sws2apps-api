import { NextFunction, Request, Response } from 'express';

const APP_VERSION = process.env.npm_package_version;

export const getRoot = async (req: Request, res: Response) => {
	res.locals.type = 'info';
	res.locals.message = 'success opening main route';
	res.status(200).json({ message: `SWS Apps API services v${APP_VERSION}` });
};

export const invalidEndpointHandler = async (req: Request, res: Response) => {
	res.locals.type = 'warn';
	res.locals.message = 'invalid endpoint';
	res.status(404).json({ message: 'error_api_invalid-endpoint' });
};

type CustomError = string & { stack: string } & { errorInfo: { code: string } };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: CustomError, req: Request, res: Response, next: NextFunction) => {
	res.locals.type = 'warn';
	res.locals.message = `An error occured: ${error.stack || error}`;
	console.log(`An error occured: ${error.stack || error}`);

	if (error.errorInfo?.code) {
		const code = error.errorInfo.code.replace('/', '_');

		res.status(500).json({ message: `error_${code}` });
		return;
	}

	res.status(500).json({ message: 'error_api_internal-error' });
};
