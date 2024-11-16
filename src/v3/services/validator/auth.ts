export const authBearerCheck = (value: string) => {
	if (!value.startsWith('Bearer ')) {
		throw new Error('Invalid token format');
	}

	const token = value.split(' ')[1];
	if (!token) {
		throw new Error('Token is missing');
	}

	return true;
};
