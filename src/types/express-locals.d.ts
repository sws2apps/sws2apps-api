import type { User } from '../v3/classes/User.js';

declare module 'express-serve-static-core' {
	interface Locals {
		failedLoginAttempt: boolean;
		message: string;
		type: string;
		currentUser: User;
	}
}
