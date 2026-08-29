import type { User } from '../modules/users/user.js';

declare module 'express-serve-static-core' {
	interface Locals {
		failedLoginAttempt: boolean;
		message: string;
		type: string;
		currentUser: User;
	}
}
