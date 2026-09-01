import type { LogLevel } from '@logtail/types';
import type { User } from '#modules/users/index.js';

declare module 'express-serve-static-core' {
	interface Locals {
		failedLoginAttempt: boolean;
		message: string;
		type: LogLevel;
		currentUser: User;
	}
}
