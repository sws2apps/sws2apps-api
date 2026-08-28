export const calculateJsonSize = (value: unknown) => {
	if (!value || typeof value !== 'object') return 0;

	try {
		return Buffer.byteLength(JSON.stringify(value), 'utf8');
	} catch {
		return 0;
	}
};
