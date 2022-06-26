export const congregationRoleChecker = () => {
	return async (req, res, next) => {
		try {
			// check if session is authenticated for an approved role
			const { cong_role } = res.locals.currentUser;
			if (cong_role.includes('lmmo') || cong_role.includes('lmmo-backup')) {
				next();
			} else {
				res.locals.type = 'warn';
				res.locals.message = 'user do not have the appropriate role';
				res.locals.failedLoginAttempt = true;
				res.status(403).json({ message: 'UNAUTHORIZED_ACCESS' });
			}
		} catch (err) {
			next(err);
		}
	};
};
