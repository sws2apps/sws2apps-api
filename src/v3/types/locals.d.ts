/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response as ExpressResponse, NextFunction } from 'express';
import { User } from '../classes/User.ts';

declare module 'express-serve-static-core' {
	interface Locals {
		failedLoginAttempt: boolean;
		message: string;
		type: string;
		currentUser: User;
	}
}
