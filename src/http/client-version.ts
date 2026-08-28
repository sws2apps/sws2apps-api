const numericVersionPattern = /^\d+(?:\.\d+)*$/;

const parseVersion = (version: string) => {
	if (!numericVersionPattern.test(version)) return;
	return version.split('.').map(Number);
};

export const isClientVersionSupported = (clientVersion: string, minimumVersion: string) => {
	const clientParts = parseVersion(clientVersion);
	const minimumParts = parseVersion(minimumVersion);

	if (!clientParts || !minimumParts) return false;

	const numberOfParts = Math.max(clientParts.length, minimumParts.length);

	for (let index = 0; index < numberOfParts; index++) {
		const clientPart = clientParts[index] ?? 0;
		const minimumPart = minimumParts[index] ?? 0;

		if (clientPart > minimumPart) return true;
		if (clientPart < minimumPart) return false;
	}

	return true;
};
